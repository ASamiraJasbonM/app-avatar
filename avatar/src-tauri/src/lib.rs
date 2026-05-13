use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn quit_app() {
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_shadow(false);
            }

            let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let show_i =
                tauri::menu::MenuItem::with_id(app, "show", "Mostrar", true, None::<&str>)?;
            let hide_i =
                tauri::menu::MenuItem::with_id(app, "hide", "Ocultar", true, None::<&str>)?;

            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

            let _tray = tauri::tray::TrayIconBuilder::with_id("tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => std::process::exit(0),
                    "show" => {
                        let window = app.get_webview_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    "hide" => {
                        let window = app.get_webview_window("main").unwrap();
                        window.hide().unwrap();
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button,
                        button_state,
                        ..
                    } = event
                    {
                        if button == tauri::tray::MouseButton::Left
                            && button_state == tauri::tray::MouseButtonState::Up
                        {
                            let app = tray.app_handle();
                            let window = app.get_webview_window("main").unwrap();
                            if window.is_visible().unwrap() {
                                window.hide().unwrap();
                            } else {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, quit_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
