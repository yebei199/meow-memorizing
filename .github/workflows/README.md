# .github/workflows

GitHub Actions entry points for repository automation.

- `ci.yml` - validates pull requests and `master` pushes with Bun, TypeScript,
  Biome, Rust checks, a test-only Chrome bundle, and Playwright e2e tests.
- `release.yml` - on `v*` tag pushes, validates the tag matches
  `package.json`, builds Chrome/Firefox/source ZIP artifacts, and publishes the
  GitHub release.
