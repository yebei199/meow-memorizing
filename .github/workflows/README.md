# .github/workflows

GitHub Actions entry points for repository automation.

- `ci.yml` - validates pull requests and `master` pushes with Bun, TypeScript,
  Biome, Rust checks, extension builds, and Playwright e2e tests.
- `release.yml` - on `master`, publishes release ZIP artifacts only when the
  `package.json` version changes.
