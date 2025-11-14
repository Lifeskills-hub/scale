const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const db = new sqlite3.Database('./db.sqlite');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      applianceName TEXT,
      issueDescription TEXT,
      image TEXT,
      location TEXT,
      zip TEXT,
      createdAt TEXT
    )
  `);
});

// Multer: save image
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// POST: create request
app.post('/api/requests', upload.single('image'), (req, res) => {
  const { applianceName, issueDescription, city, zip, lat, lng } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const id = Date.now().toString();

  const location = JSON.stringify({ city, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null });

  db.run(
    `INSERT INTO requests (id, applianceName, issueDescription, image, location, zip, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, applianceName, issueDescription, image, location, zip, new Date().toLocaleString()],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id });
    }
  );
});

// GET: all requests
app.get('/api/requests', (req, res) => {
  db.all(`SELECT * FROM requests ORDER BY createdAt DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows.forEach(r => r.location = JSON.parse(r.location));
    res.json(rows);
  });
});

// Ensure uploads folder
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
