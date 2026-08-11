// MySQL pool — same env vars/defaults as PHP src/config.php.
import mysql from 'mysql2/promise';

export function createPool(db) {
  return mysql.createPool({
    host: db.host,
    port: Number(db.port),
    user: db.user,
    password: db.password,
    database: db.database,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
  });
}
