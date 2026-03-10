# CLAUDE.md

**yyawf** — Tampermonkey/Violentmonkey userscript for Weibo.com. Single file: [yyawf.user.js](yyawf.user.js) (~1915 lines). No build system, package manager, or tests. Edit directly; reload in script manager to test. Deploy via GitHub Pages from `yyawf` branch.

## Architecture: Dual-Context Pattern

| Context | Lines | Description |
|---|---|---|
| **Page script** | ~35–804 | Injected via `unsafeWindow` at `document-start`. Hooks `Object.prototype` to intercept Vue init, registers mixins for lifecycle hooks, does all DOM filtering and style injection. |
| **Content script** | ~806–end | Runs in GM sandbox. Manages `GM_getValue`/`GM_setValue` settings persistence and settings UI. Proxies network requests for page script. |

**MessageBroker** — duplicated in both contexts (intentional; can't share references). IPC via `document.dispatchEvent(new CustomEvent(...))` with request/response semantics and 10s timeout.

## Key Components

- **Filtering**: `feedFilter()`, `commentFilter()`, `hotSearchFilter()`. `filterConfig()` is memoized — call `invalidateFilterCache()` after settings change. `BoundedSet` (5000-item cap) tracks processed items.
- **ConfigManager**: Settings keyed by Weibo user ID (multi-account). `CONFIG_TEMPLATE` drives the 3-tab settings UI: **微博过滤**, **界面清理**, **关于**. `static: true` settings require reload; dirty-state toast notifies user.
- **UI**: `uiDialog()` draggable dialog. Custom elements: `<yawf-tabs>`, `<yawf-checkbox>`, `<yawf-select>`, `<yawf-strings>`, `<yawf-users>`. Entry via gear icon (top nav) or FAB (bottom-right).

## DOM Selectors

See [docs/dom-map.md](docs/dom-map.md) for authoritative selector map.
- `woo-`, `wbpro-` classes are stable — target directly.
- CSS Modules hashed classes (`_name_hash`) — use `[class*="_wrap_"]` attribute selectors.

## Key Patterns

- `addLifecycleListener(componentName, lifecycle, callback)` — Vue lifecycle hooks.
- `addStyle(css)` / `flushStyles()` — batch CSS injection; never inject one-by-one.
- `wrapFunction(fn)` — uses `WeakMap` (not `__raw__` properties) to track originals.
- `appReady` — Promise resolving when Vue app is ready; consolidate `.then()` chains.
