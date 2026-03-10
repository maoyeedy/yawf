# CLAUDE.md

**yyawf** — Tampermonkey/Violentmonkey userscript for Weibo.com. Built with **Vite, TypeScript, Svelte 5, and `vite-plugin-monkey`**. Linting/formatting via **Biome**.

## Development Workflow

* **Dev:** Run `npm run dev` to start the Vite dev server and install the proxy script in your script manager (enables Hot Module Replacement).
* **Build:** Run `npm run build` — runs `svelte-check` then `vite build`, outputs `dist/yyawf.user.js`.
* **Check:** Run `npm run check` for Svelte type-checking only.
* **Lint/Format:** `npm run lint` and `npm run format` use Biome.
* **Deploy:** Commit the built file or deploy via GitHub Pages from the `yyawf` branch.

## Project Structure & Architecture

The project strictly separates the isolated extension context from the main page context to ensure security and proper Vue interception.

```text
src/
├── main.ts                    # Entry point (Content Script / Sandbox)
├── vite-env.d.ts
├── page/
│   ├── index.ts               # Main page logic (Vue hooks, filtering)
│   └── injector.ts            # <script> tag injection utility
├── shared/
│   ├── broker.ts              # MessageBroker class for IPC
│   └── types.ts               # TypeScript interfaces (Feed, User, etc.)
└── ui/
    ├── SettingsApp.svelte      # Root Svelte app mounted in GM sandbox
    ├── configManager.ts        # ConfigManager logic
    ├── settings.ts             # Dialog mount entry point
    ├── styles.css              # Base CSS (injected by Vite)
    ├── styles.scss             # SCSS styles
    └── components/
        ├── ConfigCheckbox.svelte
        ├── ConfigPanel.svelte
        ├── Dialog.svelte
        ├── Fab.svelte
        ├── RefreshToast.svelte
        ├── StringsList.svelte
        ├── Tabs.svelte
        └── UsersList.svelte

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
* **UI**: Built with **Svelte 5**. `SettingsApp.svelte` is the root component; `settings.ts` mounts it into the GM sandbox. Svelte components in `src/ui/components/` replace the old custom elements. Entry via gear icon (top nav) or FAB (`Fab.svelte`, bottom-right). SCSS (`styles.scss`) and CSS (`styles.css`) are imported by Vite.

## DOM Selectors

See [docs/dom-map.md](docs/dom-map.md) for authoritative selector map.

* `woo-`, `wbpro-` classes are stable — target directly.
* CSS Modules hashed classes (`_name_hash`) — use `[class*="_wrap_"]` attribute selectors.

## Key Patterns

* `addLifecycleListener(componentName, lifecycle, callback)` — Vue lifecycle hooks.
* **CSS/SCSS Injection:** Import `./styles.css` or `./styles.scss` in TS/Svelte files; Vite and `vite-plugin-monkey` handle batch injection automatically.
* `wrapFunction(fn)` — uses `WeakMap` (not `__raw__` properties) to track originals.
* `appReady` — Promise resolving when Vue app is ready; consolidate `.then()` chains.
* **Svelte mounting:** Use `mount(SettingsApp, { target })` (Svelte 5 API) — not `new Component()`.
