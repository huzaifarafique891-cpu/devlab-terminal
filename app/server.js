/**
 * Express server - simple notes website with MySQL
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'webapp_db',
  waitForConnections: true,
  connectionLimit: 10,
};

let pool;

async function initDatabase() {
  const maxRetries = 30;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      pool = mysql.createPool(dbConfig);
      const conn = await pool.getConnection();

      await conn.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const [rows] = await conn.query('SELECT COUNT(*) AS count FROM notes');
      if (rows[0].count === 0) {
        await conn.query('INSERT INTO notes (content) VALUES (?), (?)', [
          'Welcome to my-webapp!',
          'Your notes are saved in MySQL.',
        ]);
      }

      conn.release();
      console.log('MySQL connected');
      return;
    } catch (err) {
      console.warn(`DB attempt ${attempt}/${maxRetries}: ${err.message}`);
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// Health check for Docker and Kubernetes probes
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'error' });
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const [notes] = await pool.query(
      'SELECT id, content, created_at FROM notes ORDER BY id DESC'
    );
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  const { content } = req.body;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }
  try {
    const [result] = await pool.query('INSERT INTO notes (content) VALUES (?)', [
      String(content).trim(),
    ]);
    const [rows] = await pool.query('SELECT * FROM notes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  await initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}

module.exports = { app, initDatabase };
