# Changelog

## [1.0.1](https://github.com/vanhanit/pre-compress/compare/v1.0.0...v1.0.1) (2026-10-14)


### Build System

* license under PolyForm Shield 1.0.0 ([f9dc7e5](https://github.com/vanhanit/pre-compress/commit/f9dc7e59099b8ae8958319705cb50bebb94d8a6a))

## 1.0.0 (2026-10-14)


### Bug Fixes

* count written files in the summary ([06f36d5](https://github.com/vanhanit/pre-compress/commit/06f36d5e670ed2adf72be99a5cfba3baf2a99c6f))
* recompress outdated files with --skip-existing ([92928d7](https://github.com/vanhanit/pre-compress/commit/92928d7ff14705b4d6c25e1546ad5bb4a8efa1cf))
* report cli errors instead of crashing ([5b923ec](https://github.com/vanhanit/pre-compress/commit/5b923ecdcd8f9819a7b458b57648ca8b62ec7df7))
* ship the compiled cli in the package ([33a6c28](https://github.com/vanhanit/pre-compress/commit/33a6c2821ddc638ca5621b196d2d6aefba9cba7a))
* sort found files alphabetically ([2e8b238](https://github.com/vanhanit/pre-compress/commit/2e8b238800af5b71f10e1bc8cb09c7977f129885))
* succeed when no files match ([ded7db6](https://github.com/vanhanit/pre-compress/commit/ded7db6c60cfa192b4a1123334711f6d790f6a93))
* write compressed files atomically ([fe91b6c](https://github.com/vanhanit/pre-compress/commit/fe91b6c0325ccd9d19cf4ff3f9a2995444350b9e))


### Performance Improvements

* check found files in parallel ([489abf0](https://github.com/vanhanit/pre-compress/commit/489abf079dc09aca514f2b2eb1666aa63920c13d))
* skip writing compressed files that are not smaller ([9912d24](https://github.com/vanhanit/pre-compress/commit/9912d241689eeea4e838515d06cfb1465ff0124b))
