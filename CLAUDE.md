# CLAUDE.md

**yyawf** — Tampermonkey/Violentmonkey userscript for Weibo.com. Built with **Vite, TypeScript, and `vite-plugin-monkey**`.

## Development Workflow

* **Dev:** Run `npm run dev` to start the Vite dev server and install the proxy script in your script manager (enables Hot Module Replacement).
* **Build:** Run `npm run build` to compile the final `dist/yyawf.user.js`.
* **Deploy:** Commit the built file or deploy via GitHub Pages from the `yyawf` branch.

## Project Structure & Architecture

The project strictly separates the isolated extension context from the main page context to ensure security and proper Vue interception.

```text
src/
├── main.ts            # Entry point (Content Script / Sandbox)
├── page/
│   ├── index.ts       # Main page logic (Vue hooks, filtering)
│   └── injector.ts    # <script> tag injection utility
├── shared/
│   ├── broker.ts      # MessageBroker class for IPC
│   └── types.ts       # TypeScript interfaces (Feed, User, etc.)
└── ui/
    ├── settings.ts    # ConfigManager and Dialog UI logic
    └── styles.css     # Injected automatically by Vite

```

### Dual-Context Pattern

| Context | Location | Description |
| --- | --- | --- |
| **Page script** | `src/page/` | Injected via `<script>` appended to `document.documentElement` at `document-start` (avoids `unsafeWindow.eval` and CSP blocks). Hooks `Object.prototype` to intercept Vue init, registers mixins, performs DOM filtering. |
| **Content script** | `src/main.ts`, `src/ui/` | Runs in the GM sandbox. Manages `GM_getValue`/`GM_setValue` persistence, renders settings UI, and proxies network requests for the page script. |

**IPC (MessageBroker):** Imported from `src/shared/broker.ts` into both contexts. Communication uses `document.dispatchEvent(new CustomEvent(...))` with request/response semantics and a 10s timeout.

## Key Components

* **Types:** Centralized in `shared/types.ts` (`Feed`, `Comment`, `User`). Enforced across IPC boundaries.
* **Filtering**: `feedFilter()`, `commentFilter()`, `hotSearchFilter()`. `filterConfig()` is memoized — call `invalidateFilterCache()` after settings change. `BoundedSet` (5000-item cap) tracks processed items.
* **ConfigManager**: Settings keyed by Weibo user ID. The `CONFIG_TEMPLATE` drives the settings UI. `static: true` settings require reload; a dirty-state toast notifies the user.
* **UI**: Draggable `uiDialog()`. Custom elements (`<yawf-tabs>`, `<yawf-checkbox>`, etc.) are now managed in `src/ui/`. Entry via gear icon (top nav) or FAB (bottom-right). CSS is handled natively by Vite imports.

## DOM Selectors

See [docs/dom-map.md](docs/dom-map.md) for authoritative selector map.

* `woo-`, `wbpro-` classes are stable — target directly.
* CSS Modules hashed classes (`_name_hash`) — use `[class*="_wrap_"]` attribute selectors.

## Key Patterns

* `addLifecycleListener(componentName, lifecycle, callback)` — Vue lifecycle hooks.
* **CSS Injection:** Simply `import './styles.css'` in the TS files; Vite and `vite-plugin-monkey` handle the batch injection automatically.
* `wrapFunction(fn)` — uses `WeakMap` (not `__raw__` properties) to track originals.
* `appReady` — Promise resolving when Vue app is ready; consolidate `.then()` chains.
