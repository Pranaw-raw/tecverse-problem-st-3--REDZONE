const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/reservehub.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;
let saveTimeout = null;

const persistToDisk = () => {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Error saving database to disk:', err.message);
  }
};

const schedulePersist = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(persistToDisk, 50);
};

const getDb = async () => {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
  }
  return dbInstance;
};

// Promisified DB helpers
const dbGet = async (sql, params = []) => {
  const db = await getDb();
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    if (stmt.step()) {
      return stmt.getAsObject();
    }
    return null;
  } finally {
    stmt.free();
  }
};

const dbAll = async (sql, params = []) => {
  const db = await getDb();
  const stmt = db.prepare(sql);
  const rows = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    return rows;
  } finally {
    stmt.free();
  }
};

const dbRun = async (sql, params = []) => {
  const db = await getDb();
  db.run(sql, params);
  schedulePersist();
  return { changes: db.getRowsModified() };
};

const dbExec = async (sql) => {
  const db = await getDb();
  db.exec(sql);
  persistToDisk();
};

const initDatabase = async () => {
  await getDb();
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'student', 'faculty', 'user')),
      department TEXT DEFAULT 'General',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Labs', 'Seminar Halls', 'Equipment', 'Sports', 'Classrooms', 'Other')),
      location TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      image_url TEXT,
      amenities TEXT,
      rules TEXT,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'maintenance', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      title TEXT NOT NULL,
      purpose TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'checked-in', 'completed', 'cancelled', 'no-show')),
      qr_code_token TEXT UNIQUE,
      checked_in_at DATETIME,
      cancelled_at DATETIME,
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      booking_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'reminder', 'confirmation', 'cancellation', 'alert')),
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings (resource_id, start_time, end_time, status);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id, status);
  `;

  await dbExec(schema);
  console.log('Database schema and tables initialized.');
};

module.exports = {
  getDb,
  dbGet,
  dbAll,
  dbRun,
  dbExec,
  persistToDisk,
  initDatabase
};
