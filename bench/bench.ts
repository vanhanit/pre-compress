import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { Agent, get } from "node:http";
import { availableParallelism, cpus, tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { compressFile } from "../src/compress.ts";
import { findFiles } from "../src/files.ts";

// Compares sending files compressed on every request with sending the files pre-compress wrote. Run with
// `npm run bench -- [options] [patterns...]`, by default on minified JavaScript from node_modules.

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    duration: { type: "string", default: "5" },
    connections: { type: "string", default: "16" }
  }
});
const duration = Number(values.duration) * 1000;
const connections = Number(values.connections);
const patterns = positionals.length > 0 ? positionals : ["node_modules/*/dist/**/*.min.js"];

interface Scenario {
  encoding: string;
  mode: "none" | "dynamic" | "static";
  level: string;
}

const SCENARIOS: readonly Scenario[] = [
  { encoding: "identity", mode: "none", level: "-" },
  { encoding: "gzip", mode: "dynamic", level: "6" },
  { encoding: "gzip", mode: "static", level: "9" },
  { encoding: "br", mode: "dynamic", level: "6" },
  { encoding: "br", mode: "static", level: "11" },
  { encoding: "zstd", mode: "dynamic", level: "3" },
  { encoding: "zstd", mode: "static", level: "19" }
];

const COMPRESSED: Readonly<Record<Scenario["mode"], string>> = {
  none: "no",
  dynamic: "on request",
  static: "pre-compressed"
};

const agent = new Agent({ keepAlive: true, maxSockets: connections });

function request(port: number, path: string, encoding: string): Promise<number> {
  return new Promise((resolve, reject) => {
    get({ port, path, agent, headers: { "Accept-Encoding": encoding } }, (response) => {
      let size = 0;
      response.on("data", (chunk: Buffer) => (size += chunk.length));
      response.on("end", () => (response.statusCode === 200 ? resolve(size) : reject(new Error(`${path} failed`))));
      response.on("error", reject);
    }).on("error", reject);
  });
}

async function cpuTime(server: ChildProcess): Promise<number> {
  server.send("cpu");
  const [usage] = (await once(server, "message")) as [NodeJS.CpuUsage];
  return (usage.user + usage.system) / 1000;
}

function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

async function measure(server: ChildProcess, port: number, count: number, scenario: Scenario): Promise<string[]> {
  const path = (index: number) => `/${scenario.mode}/${index}`;
  const sizes = await Promise.all(
    Array.from({ length: count }, (_, index) => request(port, path(index), scenario.encoding))
  );

  const latencies: number[] = [];
  let next = 0;
  const startCpu = await cpuTime(server);
  const start = performance.now();
  const end = start + duration;
  async function worker(): Promise<void> {
    while (performance.now() < end) {
      const index = next++ % count;
      const sent = performance.now();
      await request(port, path(index), scenario.encoding);
      latencies.push(performance.now() - sent);
    }
  }
  await Promise.all(Array.from({ length: connections }, worker));
  const elapsed = performance.now() - start;
  const cpu = (await cpuTime(server)) - startCpu;

  latencies.sort((a, b) => a - b);
  const transferred = sizes.reduce((sum, size) => sum + size, 0);
  return [
    scenario.encoding,
    COMPRESSED[scenario.mode],
    scenario.level,
    `${(transferred / 1024).toFixed(0)} KiB`,
    (latencies.length / (elapsed / 1000)).toFixed(0),
    percentile(latencies, 0.5).toFixed(2),
    percentile(latencies, 0.99).toFixed(2),
    (cpu / latencies.length).toFixed(3)
  ];
}

function table(rows: readonly (readonly string[])[]): string {
  const header = ["Encoding", "Compressed", "Level", "Size", "Requests/s", "p50 ms", "p99 ms", "Server CPU ms/request"];
  return [header, header.map(() => "---"), ...rows].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

const files = await findFiles(patterns);
if (files.length === 0) {
  throw new Error(`no files match ${patterns.join(" ")}`);
}

const dir = await mkdtemp(join(tmpdir(), "pre-compress-bench-"));
try {
  const copies = await Promise.all(
    files.map(async (file, index) => {
      const copy = join(dir, `${index}.js`);
      await copyFile(file, copy);
      return copy;
    })
  );
  const encodings = ["gzip", "brotli", "zstd"] as const;
  const compressStart = performance.now();
  await Promise.all(copies.map((copy) => compressFile(copy, { encodings, deleteLarger: false, skipExisting: false })));
  const compressTime = performance.now() - compressStart;

  const server = fork(join(import.meta.dirname, "server.ts"), copies);
  try {
    const [port] = (await once(server, "message")) as [number];
    const rows = [];
    for (const scenario of SCENARIOS) {
      // The scenarios run one at a time, so they don't compete for the CPU.
      rows.push(await measure(server, port, copies.length, scenario));
    }

    console.log(`${files.length} files, ${connections} connections, ${duration / 1000} s per scenario`);
    console.log(`${cpus()[0]?.model ?? "unknown CPU"}, ${availableParallelism()} cores, Node.js ${process.version}`);
    console.log(`pre-compress wrote all files in ${(compressTime / 1000).toFixed(1)} s\n`);
    console.log(table(rows));
  } finally {
    agent.destroy();
    server.disconnect();
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
