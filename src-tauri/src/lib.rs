use tauri_plugin_sql::{Migration, MigrationKind};

/// Nazwa bazy - ta sama co w `app/lib/db.ts`. Plik leży w katalogu danych aplikacji.
const DB_URL: &str = "sqlite:usos-revanced.db";

fn migrations() -> Vec<Migration> {
  vec![Migration {
    version: 1,
    description: "init",
    sql: include_str!("../migrations/0001_init.sql"),
    kind: MigrationKind::Up,
  }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations(DB_URL, migrations())
        .build(),
    )
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
