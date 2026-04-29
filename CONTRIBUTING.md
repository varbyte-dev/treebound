# Contributing to @varbyte/treebound

## Conventional Commits — obligatorio

Este proyecto usa **semantic-release** para publicar en npm automáticamente.  
La versión se determina **exclusivamente** por el tipo de commit. Sin convention, no hay release.

### Formato

```
<tipo>(<scope opcional>): <descripción en imperativo>

[cuerpo opcional]

[pie opcional — para breaking changes]
```

### Tipos y su impacto en semver

| Tipo | Cuándo usarlo | Versión |
|---|---|---|
| `feat` | Nueva funcionalidad para el usuario | `minor` — 1.0.0 → **1.1.0** |
| `fix` | Corrección de bug | `patch` — 1.0.0 → **1.0.1** |
| `perf` | Mejora de rendimiento sin cambio de API | `patch` |
| `revert` | Revertir un commit anterior | `patch` |
| `docs` | Solo documentación | *(no release)* |
| `style` | Formato, espacios, punto y coma | *(no release)* |
| `refactor` | Refactoring sin nueva funcionalidad ni bug fix | *(no release)* |
| `test` | Añadir o corregir tests | *(no release)* |
| `chore` | Tareas de mantenimiento (deps, build, ci) | *(no release)* |
| `build` | Cambios en el sistema de build | *(no release)* |
| `ci` | Cambios en la configuración de CI | *(no release)* |

### Breaking changes → major

Cualquier commit puede ser un **breaking change** añadiendo en el pie:

```
feat(engine): cambiar firma de TreeBoundEngine constructor

BREAKING CHANGE: el segundo argumento `config` ahora va antes que `initialData`.
El orden anterior era (root, data, config), ahora es (root, config, data).
```

Esto → `major` — 1.2.3 → **2.0.0**, independientemente del tipo (`feat`, `fix`, etc.).

---

## Ejemplos reales

```bash
# Nueva directiva → minor
git commit -m "feat(directives): add *show directive as alias for *if"

# Fix de bug en el parser → patch
git commit -m "fix(parser): handle escaped quotes inside string literals"

# Mejora de rendimiento → patch
git commit -m "perf(engine): cache dependency map during setupReactivity"

# Documentación → SIN release
git commit -m "docs: add v-model equivalent example to README"

# Breaking change → major
git commit -m "feat(element)!: rename initialState() to state()

BREAKING CHANGE: initialState() ha sido renombrado a state() para consistencia
con la nomenclatura de Web Components. Actualiza tus subclases de TreeBoundElement."
```

---

## Branches

| Branch | Propósito | Canal npm |
|---|---|---|
| `main` | Releases estables | `latest` |
| `beta` | Pre-releases beta | `beta` — instalar con `npm i @varbyte/treebound@beta` |
| `alpha` | Pre-releases alpha | `alpha` — instalar con `npm i @varbyte/treebound@alpha` |

---

## Secrets requeridos en GitHub

El workflow de release necesita dos secrets configurados en **Settings → Environments → `azure-publish`**:

| Secret | Obtener de | Permisos necesarios |
|---|---|---|
| `AZURE_ARTIFACTS_PAT` | Azure DevOps → User Settings → Personal Access Tokens | **Packaging: Read & Write** |
| `GH_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens (classic) | `repo` + `write:packages` |

### Cómo generar el PAT de Azure DevOps

1. Ir a `https://dev.azure.com/varbytedev` → icono de usuario (arriba derecha) → **Personal Access Tokens**
2. **New Token** → nombre: `github-actions-treebound`
3. Scope: `Packaging` → marcar **Read & Write**
4. Expiration: 1 año (máximo recomendado — poner recordatorio para renovar)
5. Copiar el token generado → guardarlo en GitHub como secret `AZURE_ARTIFACTS_PAT`

> **El token NO va en base64 en el secret.** El workflow lo codifica automáticamente.  
> Solo pega el token raw tal como lo genera Azure DevOps.

### Instalación local del paquete

Para instalar desde el feed privado en una máquina local, el `.npmrc` del proyecto ya tiene la URL del registry. Solo necesitas autenticarte una vez:

```bash
# Obtener las credenciales para el feed (requiere Azure CLI o vsts-npm-auth)
npx vsts-npm-auth -config .npmrc

# O manualmente: añadir a ~/.npmrc (NO al .npmrc del proyecto)
# //pkgs.dev.azure.com/varbytedev/_packaging/varbytedev/npm/registry/:_password=<BASE64_DE_:TU_PAT>
# //pkgs.dev.azure.com/varbytedev/_packaging/varbytedev/npm/registry/:username=varbytedev
# //pkgs.dev.azure.com/varbytedev/_packaging/varbytedev/npm/registry/:email=tu@email.com
# //pkgs.dev.azure.com/varbytedev/_packaging/varbytedev/npm/registry/:always-auth=true
```

> **Por qué `GH_TOKEN` en lugar de `GITHUB_TOKEN`?**  
> `GITHUB_TOKEN` generado automáticamente por Actions NO puede disparar otros workflows.  
> semantic-release necesita hacer `git push` del commit de release y crear el tag — si usas `GITHUB_TOKEN` los workflows de CI no se disparan sobre ese commit.  
> Con un PAT (`GH_TOKEN`) sí se disparan.

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Tests en modo watch
npm run test:watch

# Tests con cobertura
npm run test:coverage

# Tipo check
npx tsc --noEmit

# Playground interactivo
npm run playground

# Preview de qué release generaría semantic-release (sin publicar)
npx semantic-release --dry-run
```
