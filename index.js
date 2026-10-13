const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g,'_'))
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB - for video
});

// ===== DATA (In-Memory - keeps your current settings) =====
let users = [];
let groups = [{ id: 'g1', name: 'General', desc: 'General group chat', members: 1 }];
let statuses = [];
let messages = [];

// ===== API =====
app.post('/api/register', (req, res) => {
  const { name } = req.body;
  let user = users.find(u => u.name === name);
  if (!user) { user = { id: 'u' + Date.now() + Math.floor(Math.random()*1000), name }; users.push(user); }
  res.json(user);
});

app.get('/api/users', (req, res) => res.json(users));
app.get('/api/groups', (req, res) => res.json(groups));
app.post('/api/groups', (req, res) => {
  const g = { id: 'g' + Date.now(), name: req.body.name, desc: req.body.desc || 'Group chat', members: 1, createdBy: req.body.createdBy };
  groups.unshift(g);
  io.emit('new-group', g);
  res.json(g);
});
app.get('/api/status', (req, res) => res.json(statuses));
app.post('/api/status', (req, res) => {
  const s = { id: 's' + Date.now(), name: req.body.name || 'Me', text: req.body.text || req.body.last, last: req.body.text || req.body.last, time: new Date().toLocaleString() };
  statuses.unshift(s);
  io.emit('new-status', s);
  res.json(s);
});
app.get('/api/messages', (req, res) => {
  const { from, to } = req.query;
  const list = messages.filter(m => (m.from === from && m.to === to) || (m.from === to && m.to === from));
  res.json(list);
});

// ===== UPLOAD - FIXED FOR PHOTO / VIDEO / VOICE =====
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = '/uploads/' + req.file.filename;
  res.json({ url, type: req.file.mimetype, name: req.file.originalname });
});

// ===== FREE AI =====
app.post('/chat', (req, res) => {
  const msg = (req.body.message || '').toLowerCase();
  let reply = "I hear you Boss! 🔥 Ask me anything - I fit help with business, school, coding, or gist!";
  if (msg.includes('hello') || msg.includes('hi')) reply = "Hello Boss! 🔥 Welcome to MayorChatZ! How I fit help you today?";
  else if (msg.includes('who are you')) reply = "I be MayorChatZ Assistant - your FREE AI inside MayorChatZ! 🚀";
  else if (msg.includes('help')) reply = "I fit help you write message, plan business, solve school work, or give ideas. Just ask!";
  else if (msg.includes('thank')) reply = "You are welcome Boss! 🙏 Anytime!";
  else if (msg.includes('love')) reply = "Awwn ❤️ Love na beautiful thing. Tell me more!";
  else if (msg.includes('money') || msg.includes('business')) reply = "For business Boss, start small, solve one problem for people, and post everyday for Status. Consistency na key! 💰";
  else reply = "Nice one! '" + req.body.message + "' - Tell me more, I dey listen. 🔥";
  res.json({ reply });
});

// ===== SOCKET - FIXED: ONLY ONE EMIT, NO DOUBLE =====
io.on('connection', (socket) => {
  socket.on('join', (userId) => { socket.join(userId); });

  socket.on('send-message', (m) => {
    m.id = Date.now() + '_' + Math.random().toString(36).slice(2,8);
    m.time = new Date().toLocaleTimeString();
    messages.push(m);
    // ONLY ONE emit to everybody - this stops double message
    io.emit('new-message', m);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('MayorChatZ Live on ' + PORT));
