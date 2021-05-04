# Contributing to node-fetch

* [Code of Conduct](#code-of-conduct)
* [Pull Requests](#pull-requests)
* [Node.js 12.17 and below](#nodejs-1217-and-below)

## [Code of Conduct](https://github.com/node-fetch/node-fetch/blob/master/CODE_OF_CONDUCT.md)

See [CODE_OF_CONDUCT.md](https://github.com/node-fetch/node-fetch/blob/master/CODE_OF_CONDUCT.md)

## Pull Requests

Before submitting a bug or feature pull-request:

1. Ensure you have added or modified at least one test case to thoroughly illustrate your fix or
   feature and prove that it works.
2. Run `npm run lint`, and ensure you have no errors.
3. Run `npm test`, and ensure that all tests pass and test coverage remains 100% (Note: particular
   workflows are required for [Node.js 12.17 and below](#nodejs-1217-and-below)).
4. Run `npm run test:cjs-build`, and ensure that the CommonJS version builds successfully.

## Node.js 12.17 and below

node-fetch takes advantage of ECMAScript Modules, which has gone through various changes in
Node.js 12 — because of this, contributing to node-fetch with Node.js 12.17 and below requires
particular workflows.

* **Node.js 12.17.0**: Run tests with `npm run test:experimental`.  If you need to execute a script
  directly with node, you will need to include the `--experimental-modules` option,
  e.g., `node --experimental-modules file.js`.
* **Node.js ≤12.16 (including 10.x)**: Run tests with `npm run test:esm`.  If you need to execute a
  script directly with node, you will need to include the `-r esm` option,
  e.g., `node -r esm file.js`.
