const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
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
  limits: { fileSize: 50 * 1024 * 1024 }
});

let users = [];
let groups = [{ id: 'g1', name: 'General', desc: 'General group chat', members: 1 }];
let statuses = [];
let messages = [];
let online = {}; // userId -> name

app.post('/api/register', (req, res) => {
  const { name, id } = req.body;
  // FIX: If phone already get ID, use am. If not, find by name.
  let user = null;
  if (id) user = users.find(u => u.id === id);
  if (!user) user = users.find(u => u.name === name);
  if (!user) { user = { id: id || ('u' + Date.now() + Math.floor(Math.random()*1000)), name }; users.push(user); }
  else { user.name = name; }
  res.json(user);
});

app.get('/api/users', (req, res) => {
  // Add online status
  const list = users.map(u => ({...u, online:!!online[u.id] }));
  res.json(list);
});
app.get('/api/groups', (req, res) => res.json(groups));
app.post('/api/groups', (req, res) => {
  const g = { id: 'g' + Date.now(), name: req.body.name, desc: req.body.desc || 'Group chat', members: 1, createdBy: req.body.createdBy };
  groups.unshift(g); io.emit('new-group', g); res.json(g);
});
app.get('/api/status', (req, res) => res.json(statuses));
app.post('/api/status', (req, res) => {
  const s = { id: 's' + Date.now(), name: req.body.name || 'Me', text: req.body.text || req.body.last, last: req.body.text || req.body.last, time: new Date().toLocaleString() };
  statuses.unshift(s); io.emit('new-status', s); res.json(s);
});
app.get('/api/messages', (req, res) => {
  const { from, to } = req.query;
  res.json(messages.filter(m => (m.from === from && m.to === to) || (m.from === to && m.to === from)));
});
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: '/uploads/' + req.file.filename, type: req.file.mimetype, name: req.file.originalname });
});
app.post('/chat', (req, res) => {
  const msg = (req.body.message || '').toLowerCase();
  let reply = "I hear you Boss! 🔥 Ask me anything!";
  if (msg.includes('hello') || msg.includes('hi')) reply = "Hello Boss! 🔥 Welcome to MayorChatZ! How I fit help you today?";
  else if (msg.includes('who are you')) reply = "I be MayorChatZ Assistant - your FREE AI inside MayorChatZ! 🚀";
  else if (msg.includes('thank')) reply = "You are welcome Boss! 🙏 Anytime!";
  else reply = "Nice one! '" + req.body.message + "' - Tell me more, I dey listen. 🔥";
  res.json({ reply });
});

io.on('connection', (socket) => {
  let myId = null;
  socket.on('join', (userId, userName) => {
    myId = userId;
    if (userId) online[userId] = userName || userId;
    io.emit('online-users', Object.keys(online));
    // Tell everybody to refresh list so online dot go show
    io.emit('users-changed');
  });
  socket.on('send-message', (m) => {
    m.id = Date.now() + '_' + Math.random().toString(36).slice(2,8);
    m.time = new Date().toLocaleTimeString();
    messages.push(m);
    io.emit('new-message', m); // ONLY ONE
  });
  socket.on('disconnect', () => {
    if (myId) delete online[myId];
    io.emit('online-users', Object.keys(online));
    io.emit('users-changed');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('MayorChatZ Live on ' + PORT));
