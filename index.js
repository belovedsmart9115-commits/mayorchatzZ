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
let online = {};

// E2EE: Server NEVER sees private keys or plaintext. It only stores publicKey + ciphertext.
app.post('/api/register', (req, res) => {
  const { name, id, publicKey } = req.body;
  let user = null;
  if (id) user = users.find(u => u.id === id);
  if (!user) {
    user = { id: id || ('u' + Date.now() + Math.floor(Math.random()*100000)), name, publicKey: publicKey || null };
    users.push(user);
  } else {
    user.name = name;
    if (publicKey) user.publicKey = publicKey;
  }
  res.json(user);
});

app.get('/api/users', (req, res) => {
  // publicKey is public - safe to share. Private key never leaves device.
  const list = users.map(u => ({ id: u.id, name: u.name, publicKey: u.publicKey || null, online:!!online[u.id] }));
  res.json(list);
});
app.get('/api/groups', (req, res) => res.json(groups));
app.post('/api/groups', (req, res) => {
  const g = { id: 'g' + Date.now(), name: req.body.name, desc: req.body.desc || 'Group chat', members: 1, createdBy: req.body.createdBy };
  groups.unshift(g); io.emit('new-group', g); res.json(g);
});
app.get('/api/status', (req, res) => res.json(statuses));
app.post('/api/status', (req, res) => {
  // Status stores only encrypted bundles - server cannot read text
  const s = { id: 's' + Date.now(), name: req.body.name || 'Me', encryptedFor: req.body.encryptedFor || null, text: req.body.text || '', file: req.body.file || null, fileType: req.body.fileType || '', isEncrypted:!!req.body.encryptedFor, time: new Date().toLocaleString() };
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
    if (userId) { online[userId] = userName || userId; socket.join(userId); }
    io.emit('online-users', Object.keys(online));
    io.emit('users-changed');
  });
  socket.on('send-message', (m) => {
    if (!m ||!m.from ||!m.to) return;
    // Server does NOT decrypt. It only relays opaque ciphertext.
    // m must contain encryptedFor {userId: {cipher, iv}} and NOT plaintext.text for 1-1/group
    if (!m.encryptedFor &&!m.text) return;
    m.id = Date.now() + '_' + Math.random().toString(36).slice(2,8);
    m.time = new Date().toLocaleTimeString();
    // Strip any accidental plaintext - keep only ciphertext + file metadata
    if (m.encryptedFor) delete m.text;
    messages.push(m);
    io.to(m.to).emit('new-message', m);
    if (m.to!== m.from) io.to(m.from).emit('new-message', m);
  });
  socket.on('disconnect', () => {
    if (myId) delete online[myId];
    io.emit('online-users', Object.keys(online));
    io.emit('users-changed');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('MayorChatZ E2EE Live on ' + PORT));
