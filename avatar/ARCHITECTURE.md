# Arquitectura de Avatar

Aplicación de escritorio Tauri v2 que muestra una ventana overlay transparente siempre al frente con un avatar/mascota virtual y un icono en la bandeja del sistema.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript 5.8 + Vite 7 |
| Backend | Rust (edition 2021) + Tauri v2 |
| Bundle | Tauri CLI v2 |

---

## Estructura del Proyecto

```
avatar/
├── index.html                  # Entry point HTML
├── package.json                # Dependencias y scripts npm
├── vite.config.ts              # Configuración de Vite
├── tsconfig.json               # Configuración de TypeScript
├── src/                        # Frontend React + TypeScript
│   ├── main.tsx                # Punto de entrada React
│   ├── App.tsx                 # Componente principal
│   ├── App.css                 # Estilos del overlay
│   ├── vite-env.d.ts           # Tipos de Vite
│   └── assets/                 # Imágenes
├── src-tauri/                  # Backend Rust
│   ├── Cargo.toml              # Dependencias Rust
│   ├── build.rs                # Build script de Tauri
│   ├── tauri.conf.json         # Configuración de la app Tauri
│   ├── capabilities/           # Permisos de la app
│   ├── icons/                  # Iconos de la aplicación
│   └── src/
│       ├── main.rs             # Entry point binario
│       └── lib.rs              # Lógica principal de Tauri
└── public/                     # Archivos estáticos
    ├── tauri.svg               # Imagen del avatar
    └── vite.svg                # Favicon
```

---

## Frontend — React

### `src/main.tsx` — Punto de entrada

Renderiza el componente `<App />` dentro de `React.StrictMode` en el elemento `#root`.

```
ReactDOM.createRoot(#root)
  └── <React.StrictMode>
       └── <App />
```

### `src/App.tsx` — Componente principal

**Imports:**
- `useRef` de React para el timer de arrastre
- `getCurrentWindow` de `@tauri-apps/api/window` para iniciar el arrastre nativo
- `invoke` de `@tauri-apps/api/core` para llamar comandos Rust
- `avatarImg` importado desde `./assets/avatar.png`

**Lógica de interacción (click vs arrastre):**

Usa un timer de 200ms para distinguir entre click y presión sostenida:

```
handleMouseDown
  └── setTimeout(200ms)
       └── startDragging()  ← solo si el mouse no se soltó antes

handleMouseUp
  └── clearTimeout(timer)   ← cancela el arrastre
  └── confirm("¿Detener?")  ← solo si fue click corto
       └── invoke("quit_app")
```

- **Click corto** (< 200ms): `clearTimeout` cancela el arrastre, luego `window.confirm()` pregunta si detener la app. Si acepta, llama `invoke("quit_app")` que ejecuta `std::process::exit(0)` en Rust.
- **Presión sostenida** (≥ 200ms): El timer se dispara y llama `getCurrentWindow().startDragging()`, activando el arrastre nativo de la ventana por el sistema operativo.

**Estructura del render:**
```
<div className="avatar-container">
  <img src={avatarImg} alt="Avatar" draggable={false} />
</div>
```

### `src/App.css` — Estilos

- `html, body, #root → background-color: transparent`: Permite ver a través de la ventana
- `.avatar-container`: Flexbox centrado, ocupa todo el espacio (100% × 100%)
- `user-select: none`: Previene selección de texto/imagen
- `-webkit-user-drag: none`: Previene arrastre nativo de imágenes del navegador
- Sin estilos heredados del template (limpiado por completo para el overlay)

---

## Backend — Rust

### `src-tauri/src/main.rs` — Entry point binario

```rust
// Oculta la consola en Windows RELEASE (NO QUITAR)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    avatar_lib::run()  // Delega a lib.rs
}
```

### `src-tauri/src/lib.rs` — Lógica principal

#### Comando `greet`

```rust
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
```

Comando Tauri invocable desde el frontend con `invoke("greet", { name: "Usuario" })`.

#### Comando `quit_app`

```rust
#[tauri::command]
fn quit_app() {
    std::process::exit(0);
}
```

Comando Tauri que termina el proceso inmediatamente. Invocado desde el frontend con `invoke("quit_app")` cuando el usuario confirma la salida en el diálogo de confirmación.

#### Función `run` — Configuración de la aplicación

```
tauri::Builder::default()
  ├── .plugin(tauri_plugin_opener::init())     → Plugin para abrir URLs/archivos
  ├── .setup(|app| { ... })                    → Configuración inicial
  │   ├── Menú de bandeja (3 items)
  │   │   ├── "Mostrar"  → show() + set_focus()
  │   │   ├── "Ocultar"  → hide()
  │   │   └── "Salir"    → process::exit(0)
  │   └── Icono de bandeja (TrayIcon)
  │       ├── Click izquierdo → toggle ventana (show/hide)
  │       └── Menú contextual con los 3 items
  ├── .invoke_handler(greet, quit_app)          → Registra comandos
  └── .run(generate_context!())                → Inicia la app
```

**Menú de bandeja del sistema:**

| ID | Etiqueta | Acción |
|----|----------|--------|
| `quit` | Salir | `std::process::exit(0)` |
| `show` | Mostrar | Muestra y enfoca la ventana |
| `hide` | Ocultar | Oculta la ventana |

**Evento de click en el icono:**
- Botón izquierdo + released: Alterna visibilidad de la ventana
  - Si está visible → la oculta
  - Si está oculta → la muestra y la enfoca

---

## Configuración de la Ventana (`tauri.conf.json`)

| Propiedad | Valor | Efecto |
|-----------|-------|--------|
| `title` | "Mi Avatar" | Título de la ventana |
| `width` / `height` | 300 × 300 | Tamaño fijo pequeño |
| `decorations` | `false` | Sin barra de título ni bordes |
| `transparent` | `true` | Fondo transparente (overlay) |
| `alwaysOnTop` | `true` | Siempre al frente |
| `skipTaskbar` | `true` | Sin entrada en la barra de tareas |
| `resizable` | `false` | Tamaño fijo no redimensionable |
| `center` | `false` | No centrar al abrir |
| `x` / `y` | 100 / 100 | Posición inicial en pantalla |
| `closable` | `false` | Sin botón de cerrar |

---

## Permisos (`capabilities/default.json`)

```json
[
  "core:default",
  "opener:default",
  "core:window:allow-start-dragging",
  "core:window:allow-set-always-on-top"
]
```

- `core:default`: Permisos base de Tauri
- `opener:default`: Permisos del plugin opener
- `core:window:allow-start-dragging`: Permite arrastrar la ventana
- `core:window:allow-set-always-on-top": Permite mantener la ventana al frente

---

## Flujo de la Aplicación

```
Inicio
  │
  ├── main.rs llama a lib::run()
  │
  ├── Tauri Builder configura:
  │   ├── Plugin opener
  │   ├── Sistema de menú (tray)
  │   ├── Icono de bandeja
  │   └── Comando greet
  │
  ├── Se abre ventana overlay 300×300
  │
  ├── React monta <App />:
  │   └── Muestra avatar.png con drag-region
  │
  └── Usuario puede:
      ├── Click izquierdo en avatar → confirmar salida
      ├── Presión sostenida en avatar → arrastrar ventana
      ├── Click en icono de bandeja → toggle visibilidad
      └── Menú contextual → Mostrar/Ocultar/Salir
```

---

## Comandos de Desarrollo

```bash
npm run dev          # Servidor Vite (puerto 1420)
npm run build        # Type-check + build producción
npx tauri dev        # App completa + hot reload
npx tauri build      # Build producción
npx tsc --noEmit     # Type-check solo TypeScript
```
