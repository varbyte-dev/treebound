# Changelog

All notable changes to `@varbyte/treebound` will be documented here.


## 1.0.0 (2026-04-29)

### ⚠ BREAKING CHANGES

* primera versión pública

### ✨ Features

* initial release of @varbyte/treebound v1.0.0 ([f89e514](https://github.com/varbyte-dev/treebound/commit/f89e514dc18ce3ee50cb5de029e4de3a1311702f))

### 🐛 Bug Fixes

* **build:** exclude tests from compilation and dist tarball ([8fb9a06](https://github.com/varbyte-dev/treebound/commit/8fb9a06cb02bce724b6f369f2c92993984f718e1))
* **ci:** correct Azure Artifacts auth in release workflow ([e15ea72](https://github.com/varbyte-dev/treebound/commit/e15ea724d15402d350c80f49a103e70ac3d562f7))
* **ci:** debug Azure Artifacts 401 — add npmrc inspection and explicit auth on ping ([21423a0](https://github.com/varbyte-dev/treebound/commit/21423a0e9846bb206626147e4f8829cd29b69982))
* **ci:** pull --rebase after checkout to prevent 'branch is behind remote' error ([1d4eecc](https://github.com/varbyte-dev/treebound/commit/1d4eecc1507912b15764df208c3d51ea6a407960))
* **ci:** remove deprecated always-auth from .npmrc, add npm token validation step ([4059df8](https://github.com/varbyte-dev/treebound/commit/4059df88543255551628a740b6e53a1c39006960))
* **ci:** remove PAT length validation, clarify secret format in comment ([8dbbe76](https://github.com/varbyte-dev/treebound/commit/8dbbe7654b88a24ac063e5d64bc2a0974f0a215c))
* **ci:** remove registry-url from setup-node — was generating conflicting .npmrc ([e425ff2](https://github.com/varbyte-dev/treebound/commit/e425ff219a78d78faa346ab8e41b39261549b7b9))
* **ci:** replace npm ping with curl — Azure Artifacts has no /-/ping endpoint ([ca9b79b](https://github.com/varbyte-dev/treebound/commit/ca9b79b45df40237132ee833b1e0a00f467ace99))
* **ci:** use base64(PAT) not base64(:PAT) — match Azure Artifacts .npmrc format ([c3b1c6d](https://github.com/varbyte-dev/treebound/commit/c3b1c6dfd7fdbbd26df8bdc77369cb88465f3c98))
* **ci:** validate PAT is raw (not base64) and remove debug step ([f5e7954](https://github.com/varbyte-dev/treebound/commit/f5e7954a74c1859522939e5df31904ada7517d95))
* **release:** add pkgAccess public for scoped npm package ([4af5be9](https://github.com/varbyte-dev/treebound/commit/4af5be9e2f0f891c4ed3f3fab9bf1247de1f4d9a))

## 1.0.0 (2026-04-29)

### ⚠ BREAKING CHANGES

* primera versión pública

### ✨ Features

* initial release of @varbyte/treebound v1.0.0 ([f89e514](https://github.com/varbyte-dev/treebound/commit/f89e514dc18ce3ee50cb5de029e4de3a1311702f))

### 🐛 Bug Fixes

* **build:** exclude tests from compilation and dist tarball ([8fb9a06](https://github.com/varbyte-dev/treebound/commit/8fb9a06cb02bce724b6f369f2c92993984f718e1))
* **ci:** correct Azure Artifacts auth in release workflow ([e15ea72](https://github.com/varbyte-dev/treebound/commit/e15ea724d15402d350c80f49a103e70ac3d562f7))
* **ci:** debug Azure Artifacts 401 — add npmrc inspection and explicit auth on ping ([21423a0](https://github.com/varbyte-dev/treebound/commit/21423a0e9846bb206626147e4f8829cd29b69982))
* **ci:** pull --rebase after checkout to prevent 'branch is behind remote' error ([1d4eecc](https://github.com/varbyte-dev/treebound/commit/1d4eecc1507912b15764df208c3d51ea6a407960))
* **ci:** remove deprecated always-auth from .npmrc, add npm token validation step ([4059df8](https://github.com/varbyte-dev/treebound/commit/4059df88543255551628a740b6e53a1c39006960))
* **ci:** remove PAT length validation, clarify secret format in comment ([8dbbe76](https://github.com/varbyte-dev/treebound/commit/8dbbe7654b88a24ac063e5d64bc2a0974f0a215c))
* **ci:** remove registry-url from setup-node — was generating conflicting .npmrc ([e425ff2](https://github.com/varbyte-dev/treebound/commit/e425ff219a78d78faa346ab8e41b39261549b7b9))
* **ci:** replace npm ping with curl — Azure Artifacts has no /-/ping endpoint ([ca9b79b](https://github.com/varbyte-dev/treebound/commit/ca9b79b45df40237132ee833b1e0a00f467ace99))
* **ci:** use base64(PAT) not base64(:PAT) — match Azure Artifacts .npmrc format ([c3b1c6d](https://github.com/varbyte-dev/treebound/commit/c3b1c6dfd7fdbbd26df8bdc77369cb88465f3c98))
* **ci:** validate PAT is raw (not base64) and remove debug step ([f5e7954](https://github.com/varbyte-dev/treebound/commit/f5e7954a74c1859522939e5df31904ada7517d95))
* **release:** add pkgAccess public for scoped npm package ([4af5be9](https://github.com/varbyte-dev/treebound/commit/4af5be9e2f0f891c4ed3f3fab9bf1247de1f4d9a))
