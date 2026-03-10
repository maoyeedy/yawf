# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**yyawf** is a Greasemonkey/Tampermonkey userscript for Weibo.com that filters content and cleans up the UI. It is a single-file project: all logic lives in [yyawf.user.js](yyawf.user.js) (~1650 lines).

There is no build system, package manager, or test runner. Edit the file directly and reload it in your script manager to test.

## Development

- Install via Tampermonkey or Violentmonkey by pointing to the local file path or the hosted URL.
- Script managers can auto-reload on file save during development.
- Deployment is via GitHub Pages from the `yyawf` branch.

There are no lint or test commands.

## Architecture

The script uses a **dual-context execution pattern** required by userscript sandboxing:

### Page Script (lines ~35–804)
- Injected at `document-start` into the **page context** via `unsafeWindow`.
- Hooks `Object.prototype` to intercept Vue's app initialization before it loads.
- Registers Vue mixins to tap into component lifecycle hooks (`beforeCreate`, `created`, `mounted`, `beforeUpdate`, `updated`).
- Performs all DOM filtering and style injection.
- Communicates with the content script via `CustomEvent` message passing.

### Content Script (lines ~806–end)
- Runs in the **Greasemonkey sandbox** with access to `GM_*` APIs.
- Manages settings persistence (`GM_getValue` / `GM_setValue`) and the settings UI.
- Makes network requests on behalf of the page script.

### MessageBroker
- A custom class duplicated in both contexts (by design — they cannot share references).
- Uses `document.dispatchEvent(new CustomEvent(...))` for IPC with request/response semantics and a 10s timeout.
- The duplication is intentional; cross-reference comments explain this.

### Filtering System
- `feedFilter()`, `commentFilter()`, `hotSearchFilter()` — per-item checks.
- `filterConfig()` is memoized; call `invalidateFilterCache()` after settings change.
- `BoundedSet` (5000-item limit) tracks already-processed items to avoid redundant work.

### Configuration
- `ConfigManager` stores settings keyed by Weibo user ID (multi-account support).
- `CONFIG_TEMPLATE` defines the three-tab settings UI: **微博过滤** (feed filter), **界面清理** (UI cleanup), **关于** (about/debug).
- Settings with `static: true` require a page reload; a dirty-state toast notifies the user.

### Custom UI Elements
- `uiDialog()` — draggable settings dialog.
- Custom HTML elements: `<yawf-tabs>`, `<yawf-checkbox>`, `<yawf-select>`, `<yawf-strings>`, `<yawf-users>`.
- Entry points: gear icon in the top nav and a floating action button (bottom-right).

## DOM Selectors

When writing CSS rules or targeting Weibo DOM elements, refer to [docs/dom-map.md](docs/dom-map.md) for the authoritative map of UI regions and their selectors. Key conventions:

- **Library classes** (`woo-`, `wbpro-`) are stable and safe to target directly.
- **Hashed classes** use `_name_hash` format (CSS Modules) — always use attribute selectors like `[class*="_wrap_"]` instead of exact class names.

## Key Patterns

- **`addLifecycleListener(componentName, lifecycle, callback)`** — register hooks that fire on Vue component lifecycle events.
- **`addStyle(css)` / `flushStyles()`** — batch CSS injection; always batch, never inject one-by-one.
- **`wrapFunction(fn)`** — uses `WeakMap` (not `__raw__` properties) to track original references.
- **`appReady`** — a Promise that resolves when the Weibo Vue app is initialized; consolidate `.then()` chains rather than scattering them.
