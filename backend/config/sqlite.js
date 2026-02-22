const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, "..", "mediar.sqlite");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      specialization TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      rescheduled_date TEXT,
      rescheduled_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT,
      prediction TEXT NOT NULL,
      confidence REAL NOT NULL,
      precision_score REAL NOT NULL,
      recall_score REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users_mirror (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mongo_user_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      specialization TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appointments_sqlite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mongo_appointment_id TEXT UNIQUE,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      patient_name TEXT,
      doctor_name TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL,
      rescheduled_date TEXT,
      rescheduled_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS xray_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      image_base64 TEXT NOT NULL,
      prediction TEXT NOT NULL,
      confidence REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const alterTableSafe = (sql) => {
    db.run(sql, (err) => {
      if (!err) return;
      if (String(err.message || "").toLowerCase().includes("duplicate column")) return;
      console.error("SQLite alter table warning:", err.message);
    });
  };

  alterTableSafe(`ALTER TABLE xray_shares ADD COLUMN precision REAL`);
  alterTableSafe(`ALTER TABLE xray_shares ADD COLUMN recall REAL`);
  alterTableSafe(`ALTER TABLE xray_shares ADD COLUMN f1_score REAL`);
  alterTableSafe(`ALTER TABLE xray_shares ADD COLUMN asthma_mucus_risk REAL`);
  alterTableSafe(`ALTER TABLE xray_shares ADD COLUMN class_probabilities TEXT`);
  alterTableSafe(`ALTER TABLE xray_shares ADD COLUMN hotspots TEXT`);
});

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

module.exports = {
  db,
  run,
  get,
  all,
};
