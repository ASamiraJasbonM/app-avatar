# AGENTS.md

## Project Overview

Tauri v2 desktop app (React 19 + TypeScript 5.8 + Vite 7 frontend, Rust backend).
A transparent always-on-top overlay window for an avatar/pet companion with system tray.
Package name: `avatar`, identifier: `com.milly.avatar`.

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 1420) |
| `npm run build` | Type-check + Vite build (`tsc && vite build`) |
| `npm run preview` | Preview Vite production build |
| `npm run tauri` | Run Tauri CLI |
| `npx tauri dev` | Start full Tauri dev (app window + hot reload) |
| `npx tauri build` | Build production Tauri app |

**Type checking:** `npx tsc --noEmit` (single-file check)
**Lint:** None configured. Do NOT add ESLint/Prettier without asking.
**Tests:** None configured. Do NOT add a test framework without asking.

---

## TypeScript Code Style

**Imports:** Use `import` (ESM, `"type": "module"`). Relative paths for local code. No default exports for components — use named exports. Group: built-in → third-party → local (separated by blank line).

```tsx
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { App } from "./App";
import "./App.css";
```

**Formatting:** No Prettier config. Match existing style: 2-space indent, single quotes, semicolons required, trailing commas in multiline.

**Types:** Use `interface` over `type` for object shapes. Prefer `type` for unions/utility types. Avoid `any` — use `unknown` and narrow. `strict: true` in tsconfig (noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch).

**Naming:** `camelCase` for variables/functions, `PascalCase` for components/interfaces/types, `SCREAMING_SNAKE_CASE` for constants. Booleans: `is*`, `has*`, `show*`.

**React:** Functional components with hooks. Avoid class components. Use `useState`/`useEffect`/`useCallback` as needed. One component per file (file name matches component name). Event handlers: `on*` prop pattern.

**Error handling:** Use try/catch around `invoke()` calls. Prefer early returns. No console.log in committed code.

**CSS:** Co-located `.css` files imported directly into components. Use CSS variables via `:root`. No CSS-in-JS or modules.

---

## Rust Code Style

**Imports:** Group: `std` → external crates (tauri, serde) → local (`crate::`). Blank line between groups.

```rust
use std::process;

use tauri::Manager;
use serde::{Deserialize, Serialize};

use crate::commands;
```

**Formatting:** Use `rustfmt` defaults. 4-space indent. Run `cargo fmt` before committing.

**Types:** `snake_case` for functions/variables, `PascalCase` for types/traits/enums, `SCREAMING_SNAKE_CASE` for constants. Derive common traits (`Debug`, `Clone`, `Serialize`, `Deserialize`).

**Error handling:** Use `?` operator with `Result<T, E>`. Use `.unwrap()` only in `setup`/`main` where failure is fatal. Use `anyhow` or custom error types for library code. Prefer `expect("message")` over unwrap with a descriptive message.

**Tauri commands:** Annotate with `#[tauri::command]`. Accept references for Tauri types. Return `Result<T, E>` where `E: Serialize`. Use `app.handle()` pattern rather than capturing state directly.

**Unsafe:** Avoid `unsafe` unless absolutely necessary. If used, add `// SAFETY:` comment.

**Naming conventions:**
- Functions: `snake_case` (e.g., `get_window`, `toggle_visibility`)
- Types: `PascalCase` (e.g., `TrayMenu`, `AppState`)
- Variables: `snake_case`
- Constants: `SCREAMING_SNAKE_CASE`

**System tray:** Use `tauri::tray::TrayIconBuilder` with `MenuItem`. Handle menu events by `id.as_ref()`. Tray click events use pattern matching on `TrayIconEvent`.

---

## Git

- Remote: `https://github.com/ASamiraJasbonM/app-avatar.git`
- No commit convention enforced. Use descriptive present-tense messages.
- Do NOT commit `node_modules/`, `dist/`, `target/`, `.env`, `*.local`.
- Do NOT commit `src-tauri/gen/schemas/` (auto-generated).
- Do NOT commit `nul` (Windows reserved file, used locally).
- No `git push` without explicit ask. Use `gh pr create` when PR is requested.
