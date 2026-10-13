const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- REAL DATABASE (file) - so messages no lost ---
let DB_FILE = path.join(__dirname, 'db.json');
let db = { users: [], messages: [], groups: [], statuses: [] };
if (fs.existsSync(DB_FILE)) { try { db = JSON.parse(fs.readFileSync(DB_FILE)); } catch(e){} }
function save() { fs.writeFileSync(DB_FILE, JSON.stringify(db)); }

// --- UPLOAD PHOTOS / VIDEOS ---
const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: '/uploads/' + req.file.filename, type: req.file.mimetype });
});

// --- USERS - people wey sign up ---
app.get('/api/users', (req, res) => res.json(db.users));
app.post('/api/register', (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  let u = db.users.find(x => x.name === name);
  if (!u) { u = { id: Date.now().toString(), name, email: email||'', online: true, lastSeen: new Date().toISOString() }; db.users.push(u); save(); }
  res.json(u);
});

// --- MESSAGES - REAL TIME ---
app.get('/api/messages', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.json(db.messages);
  res.json(db.messages.filter(m => (m.from===from && m.to===to) || (m.from===to && m.to===from) || m.to===to));
});
app.post('/api/messages', (req, res) => {
  const msg = {...req.body, id: Date.now().toString(), time: new Date().toISOString() };
  db.messages.push(msg); save();
  io.emit('new-message', msg);
  res.json(msg);
});

// --- GROUPS ---
app.get('/api/groups', (req, res) => res.json(db.groups));
app.post('/api/groups', (req, res) => { db.groups.push({ id: Date.now().toString(),...req.body }); save(); io.emit('new-group', db.groups); res.json(db.groups); });

// --- STATUS ---
app.get('/api/status', (req, res) => res.json(db.statuses));
app.post('/api/status', (req, res) => { db.statuses.unshift({ id: Date.now().toString(),...req.body, time: new Date().toISOString() }); save(); io.emit('new-status', db.statuses); res.json(db.statuses); });

// --- YOUR ORIGINAL FREE AI CHAT - NO API KEY NEEDED! - I NO TOUCH AM ---
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ reply: "Boss talk something na! 😅" });
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(message)}?model=openai&system=You are MayorChatZ, friendly AI assistant created by Mayor. Be helpful and playful.`;
    const response = await fetch(url);
    const text = await response.text();
    res.json({ reply: text });
  } catch (err) {
    res.json({ reply: `Boss I hear you: "${message}". Network slow small, but I dey here! 🔥` });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SOCKET.IO REAL TIME - Message go show instantly for other phone ---
io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('send-message', (msg) => {
    msg.id = Date.now().toString(); msg.time = new Date().toISOString();
    db.messages.push(msg); save();
    io.emit('new-message', msg);
    if (msg.to) io.to(msg.to).emit('new-message', msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('MayorChatZ live on ' + PORT));
