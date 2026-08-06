const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const Database = require('better-sqlite3');

const app = express();
const port = process.env.PORT || 3000;

// --- Database setup ---
const db = new Database('database.sqlite');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// --- Middleware ---
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const ADMIN_USER = "admin";
const ADMIN_PASS = "secret123";

// --- Routes ---
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/register.css', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'register.css'));
});

app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send('All fields are required. <a href="/">Go back</a>');
  }

  const stmt = db.prepare('INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)');
  stmt.run(username, email, password, Date.now());

  res.send('Registration successful! <a href="/">Go back</a>');
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'admin', 'login.html'));
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdminLoggedIn = true;
    res.redirect('/admin/dashboard');
  } else {
    res.send('Invalid admin credentials. <a href="/admin/login">Try again</a>');
  }
});

app.get('/admin/dashboard', (req, res) => {
  if (!req.session.isAdminLoggedIn) {
    return res.redirect('/admin/login');
  }
  res.sendFile(path.join(process.cwd(), 'admin', 'dashboard.html'));
});

app.get('/api/users', (req, res) => {
  if (!req.session.isAdminLoggedIn) {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  const users = db.prepare('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC').all();
  res.json({
    totalUsers: users.length,
    registeredUsers: users
  });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// --- Start server ---
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});

module.exports = app;
