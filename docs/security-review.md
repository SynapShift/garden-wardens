# Dependency and security review

Review baseline: `247fba5` (2026-10-27).

| Package       | Locked before | Latest stable adopted               | Finding                                                |
| ------------- | ------------- | ----------------------------------- | ------------------------------------------------------ |
| Phaser        | 3.90.0        | 4.2.1                               | Outdated major; no npm advisory at review time         |
| Vite          | 7.3.6         | 8.3.5                               | Development-server advisories; high aggregate severity |
| source-map-js | 1.2.1         | Removed by new Vite dependency tree | High-severity source-map parsing denial of service     |

Versions verified using the npm registry, including dist tags and deprecation metadata.
Both direct dependencies previously used caret ranges; all direct npm dependencies
are now exact pins. `npm ci` reproduces the committed dependency tree.
The supported toolchain is Node 24 (see `.nvmrc`); the former `>=20`
claim was too broad for the current build toolchain.

Sources: [Vite migration](https://vite.dev/guide/migration),
[Phaser releases](https://github.com/phaserjs/phaser/releases),
[source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
See `npm audit` for the complete current advisory set.

After the update: **zero known npm vulnerabilities** at review time, including
build/test dependencies. The local pipeline fails on any audit severity.
The production build and Chromium desktop/mobile smoke tests pass after the
Phaser 4 upgrade. The browser test catches uncaught runtime errors.

The app is a static client-side game, with no login, server API, user uploads,
or persisted user content. No dynamic HTML/eval or application network API calls
were found in the game source. Local dev and preview bind to loopback by default.
The stylesheet loads a Google font; that request exposes ordinary request metadata
to the font provider. This is a scoped source/dependency review, not a penetration
test, and a clean registry audit does not establish absence of vulnerabilities.

Outstanding supply-chain hardening: GitHub Actions are version-tagged rather than
commit-pinned; the container base image is reviewed separately when Docker is added.
