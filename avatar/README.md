# Avatar

A desktop application that displays a transparent **always-on-top** overlay window with a virtual pet avatar and a system tray icon.

Built with **Tauri v2** (Rust) + **React 19** + **TypeScript 5.8** + **Vite 7**.

![Avatar](src/assets/avatar.png)

## Features

- **Transparent overlay**: Borderless window with transparent background
- **Always on top**: Stays above all other windows
- **Left click**: Shows confirmation to quit the app
- **Hold & drag**: Drag the window by holding the avatar (~200ms press)
- **System tray**: Tray icon with context menu
  - Show / Hide the window
  - Quit the application
- **Tray click**: Toggles window visibility
- **No taskbar**: Does not appear in the taskbar

## Getting Started

```bash
git clone https://github.com/ASamiraJasbonM/app-avatar.git
cd app-avatar/avatar
npm install
npx tauri dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 1420) |
| `npm run build` | Type-check + production build |
| `npx tauri dev` | Start full Tauri app with hot reload |
| `npx tauri build` | Build app for distribution |

## Window Configuration

| Property | Value |
|----------|-------|
| Size | 300 × 300 |
| Decorations | Borderless |
| Background | Transparent |
| Always on Top | Yes |
| Resizable | No |
| Initial position | (100, 100) |

## Structure

```
src/               # Frontend React + TypeScript
src-tauri/         # Backend Rust + Tauri
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## Recommended IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
