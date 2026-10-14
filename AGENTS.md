# Agent guidelines

pre-compress is a CLI that writes gzip (`.gz`) and brotli (`.br`) versions of static files next to the originals, so a
web server can send them from disk instead of compressing on every request.

## Commits

- Use [Conventional Commits](https://www.conventionalcommits.org): `type(scope): subject`. Common types: `feat`, `fix`,
  `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`.
- Keep commits atomic: one logical change per commit, together with its tests. Every commit should pass the checks.
- Keep the subject short (about 50 characters), imperative and lower case, without a trailing period.
- The body is optional. Use it only to say why the change is needed, or to describe something the diff does not make
  obvious. Never list what was done.

## Workflow

- Work on a branch and open a pull request to `master`. Never push directly to `master`.
- Use test-driven development where possible: write a failing test, make it pass, then refactor.
- All code in `src/` must have unit tests in `tests/`. New and refactored code must be covered.
- Run `npm run check` (lint, formatting, type check and tests) before pushing and keep CI green.

## Dependencies

- Avoid third-party packages. Prefer Node.js built-ins (`node:fs`, `node:zlib`, `node:util`, `node:test`, ...).
- When a package would only replace a small amount of code, write the code instead.
- Add a package only when the implementation would be large, and the package is safe: well maintained, widely used and
  with few transitive dependencies.

## Node.js

- Support only Node.js versions that have not reached end-of-life, see the
  [release schedule](https://github.com/nodejs/Release#release-schedule). Currently 22, 24 and 26.
- When a version reaches end-of-life, update `engines` in `package.json`, the CI matrix and `@types/node` (which follows
  the lowest supported version).

## Code

- TypeScript in ESM, run by Node.js without a build. Use only erasable syntax (no enums, namespaces or parameter
  properties), import relative files with the `.ts` extension and built-in modules with the `node:` prefix.
- Keep modules small and pass dependencies, such as where output goes, as parameters so code is testable without
  mocking modules.
- `src/main.ts` is the entry point and only calls `run()` in `src/cli.ts`, which returns the exit code.
- `src/args.ts` parses arguments, `src/files.ts` finds and writes files and `src/compress.ts` compresses one file.
- CI runs SonarQube Cloud when the `SONAR_TOKEN` secret is set. Keep its quality gate green: no new issues and full
  coverage of new code.

## Tests

- Tests use `node:test` and `node:assert/strict`, and live in `tests/` as `*.test.ts`. Node runs them without a build.
- Use a temporary directory for tests that touch the file system, and remove it afterwards.
- `npm test` runs the tests, `npm run test:coverage` also writes `coverage/lcov.info`.

## Commands

- `npm run check`: everything CI checks.
- `npm run lint`, `npm run format`, `npm run typecheck`: ESLint, Prettier and TypeScript.
- `npm run build`: compile to `dist/`.
