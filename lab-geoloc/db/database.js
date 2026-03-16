import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./geoloc.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS busquedas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origen_lat TEXT,
      origen_lon TEXT,
      destino_lat TEXT,
      destino_lon TEXT,
      distancia REAL,
      duracion REAL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

export default db;