const waitPort = require('wait-port');
const fs = require('fs');
const mysql = require('mysql');

const {
  MYSQL_HOST: HOST,
  MYSQL_HOST_FILE: HOST_FILE,
  MYSQL_USER: USER,
  MYSQL_USER_FILE: USER_FILE,
  MYSQL_PASSWORD: PASSWORD,
  MYSQL_PASSWORD_FILE: PASSWORD_FILE,
  MYSQL_DB: DB,
  MYSQL_DB_FILE: DB_FILE,
  MYSQL_PORT: PORT = '3306', // NUEVO: puerto configurable
} = process.env;

let pool = null;
const portNum = Number(PORT) || 3306;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function init() {
  const host = HOST_FILE ? fs.readFileSync(HOST_FILE, 'utf8').trim() : HOST;
  const user = USER_FILE ? fs.readFileSync(USER_FILE, 'utf8').trim() : USER;
  const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE, 'utf8').trim() : PASSWORD;
  const database = DB_FILE ? fs.readFileSync(DB_FILE, 'utf8').trim() : DB;

  if (!host || !user || !password || !database) {
    throw new Error('Faltan variables MYSQL_HOST/USER/PASSWORD/DB');
  }

  // Espera a que el puerto esté abierto
  await waitPort({ host, port: portNum });

  // Crea el pool usando el MISMO puerto
  pool = mysql.createPool({
    connectionLimit: 5,
    host,
    port: portNum,
    user,
    password,
    database,
    charset: 'utf8mb4',
    acquireTimeout: 20000,
    connectTimeout: 20000,
    waitForConnections: true,
  });

  // Reintentos hasta que el servidor acepte queries (MySQL 8 a veces abre el puerto antes)
  for (let i = 0; i < 20; i++) {
    try {
      await new Promise((res, rej) => pool.query('SELECT 1', err => (err ? rej(err) : res())));
      break; // listo
    } catch (e) {
      if (i === 19) throw e;
      await sleep(1000);
    }
  }

  // Crea la tabla si no existe
  await new Promise((acc, rej) => {
    pool.query(
      'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean) DEFAULT CHARSET utf8mb4',
      err => (err ? rej(err) : acc())
    );
  });

  console.log(`Connected to mysql db at ${host}:${portNum}`);
}

async function teardown() {
  if (!pool) return; // no rompas si init falló
  await new Promise((acc, rej) => pool.end(err => (err ? rej(err) : acc())));
  pool = null;
}

async function getItems() {
  return new Promise((acc, rej) => {
    pool.query('SELECT * FROM todo_items', (err, rows) => {
      if (err) return rej(err);
      acc(rows.map(item => ({ ...item, completed: item.completed === 1 })));
    });
  });
}

async function getItem(id) {
  return new Promise((acc, rej) => {
    pool.query('SELECT * FROM todo_items WHERE id=?', [id], (err, rows) => {
      if (err) return rej(err);
      const row = rows[0];
      acc(row ? { ...row, completed: row.completed === 1 } : undefined);
    });
  });
}

async function storeItem(item) {
  return new Promise((acc, rej) => {
    pool.query(
      'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
      [item.id, item.name, item.completed ? 1 : 0],
      err => (err ? rej(err) : acc())
    );
  });
}

async function updateItem(id, item) {
  return new Promise((acc, rej) => {
    pool.query(
      'UPDATE todo_items SET name=?, completed=? WHERE id=?',
      [item.name, item.completed ? 1 : 0, id],
      err => (err ? rej(err) : acc())
    );
  });
}

async function removeItem(id) {
  return new Promise((acc, rej) => {
    pool.query('DELETE FROM todo_items WHERE id = ?', [id], err => (err ? rej(err) : acc()));
  });
}

module.exports = {
  init,
  teardown,
  getItems,
  getItem,
  storeItem,
  updateItem,
  removeItem,
};
