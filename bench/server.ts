import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip, zstdCompress } from "node:zlib";

// Serves the files given as arguments from memory, so only the compression differs between the scenarios. GET
// /<mode>/<index> sends the file at the index with the encoding in Accept-Encoding, compressed on every request (mode
// "dynamic") or read from the file pre-compress wrote (mode "static").

type Encoding = "identity" | "gzip" | "br" | "zstd";

const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);
const zstdCompressAsync = promisify(zstdCompress);

// The default levels of zlib, ngx_brotli and zstd, which servers use for compressing on the fly.
const DYNAMIC: Readonly<Record<Encoding, (data: Buffer) => Promise<Buffer>>> = {
  identity: (data) => Promise.resolve(data),
  gzip: (data) => gzipAsync(data, { level: 6 }),
  br: (data) => brotliCompressAsync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }),
  zstd: (data) => zstdCompressAsync(data, { params: { [constants.ZSTD_c_compressionLevel]: 3 } })
};

const EXTENSIONS: Readonly<Record<Encoding, string>> = { identity: "", gzip: ".gz", br: ".br", zstd: ".zst" };

async function load(file: string): Promise<Record<Encoding, Buffer>> {
  const [identity, gzip, br, zstd] = await Promise.all(
    Object.values(EXTENSIONS).map((extension) => readFile(file + extension))
  );
  return { identity, gzip, br, zstd };
}

const files = await Promise.all(process.argv.slice(2).map(load));

const server = createServer((request, response) => {
  const [, mode, index] = request.url?.split("/") ?? [];
  const file = files[Number(index)];
  const encoding = (request.headers["accept-encoding"] ?? "identity") as Encoding;
  const body = mode === "static" ? Promise.resolve(file[encoding]) : DYNAMIC[encoding](file.identity);
  body.then(
    (data) => {
      response.writeHead(200, {
        "Content-Type": "text/javascript",
        "Content-Length": data.length,
        ...(encoding === "identity" ? {} : { "Content-Encoding": encoding }),
        Vary: "Accept-Encoding"
      });
      response.end(data);
    },
    (error: unknown) => {
      response.writeHead(500).end(String(error));
    }
  );
});

process.on("message", () => process.send?.(process.cpuUsage()));
process.on("disconnect", () => server.close());
server.keepAliveTimeout = 60_000;
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  process.send?.(typeof address === "object" ? address?.port : undefined);
});
