const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g,'_'))
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  let type = 'image';
  if (req.file.mimetype.startsWith('video')) type = 'video';
  if (req.file.mimetype.startsWith('audio')) type = 'audio';
  res.json({ url: '/uploads/' + req.file.filename, type });
});

let serverStatuses = [];
try { if (fs.existsSync('statuses.json')) serverStatuses = JSON.parse(fs.readFileSync('statuses.json','utf8')||'[]'); } catch(e){ serverStatuses=[]; }
function saveStatuses(){ try{ fs.writeFileSync('statuses.json', JSON.stringify(serverStatuses)); }catch(e){} }

let users = {};
io.on('connection', (socket) => {
  socket.on('join', (name) => {
    if (!name ||!name.trim()) return;
    if (Object.values(users).includes(name)) { socket.emit('joinError', 'That name don dey use, try another name'); return; }
    socket.username = name; users[socket.id] = name;
    socket.emit('joinSuccess');
    socket.emit('statusList', serverStatuses);
    io.emit('onlineUsers', Object.values(users));
    io.emit('userList', Object.values(users));
  });
  socket.on('typing', (d) => socket.broadcast.emit('typing', d));
  socket.on('newStatus', (s) => {
    if (!s.id) s.id = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    if (serverStatuses.find(x => x.id===s.id)) return;
    serverStatuses.unshift(s);
    serverStatuses = serverStatuses.slice(0, 100);
    saveStatuses();
    io.emit('statusNew', s);
  });
  socket.on('deleteStatus', (id) => {
    serverStatuses = serverStatuses.filter(s => s.id!== id && s.time!== id);
    saveStatuses();
    io.emit('statusList', serverStatuses);
  });
  socket.on('message', async (msg) => {
    let { from, to, text } = msg;
    if (to === 'MayorChatZ Assistant') {
      let q = (text || '').trim(); let lower = q.toLowerCase();
      if (lower.includes('hello') || lower === 'hi' || lower === 'hey') { io.emit('message', { from: 'MayorChatZ Assistant', to: from, text: 'Hello 💖! Ask me anything, e.g. Who is Wizkid? What is Nigeria?', type: 'text' }); return; }
      if (lower.includes('who are you')) { io.emit('message', { from: 'MayorChatZ Assistant', to: from, text: 'I be MayorChatZ Assistant 🤖💖 — I fit answer questions using Wikipedia.', type: 'text' }); return; }
      let searchTerm = q.replace(/^(who is|what is|tell me about|what's|who's|explain)\s+/i, '').replace(/\?/g, '').trim() || q;
      try {
        let searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`);
        let searchData = await searchRes.json();
        if (!searchData.query ||!searchData.query.search.length) { io.emit('message', { from: 'MayorChatZ Assistant', to: from, text: `I no find "${q}" for Wikipedia. Try another word.`, type: 'text' }); return; }
        let bestTitle = searchData.query.search[0].title;
        let sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`);
        let sumData = await sumRes.json();
        let answer = sumData.extract || searchData.query.search[0].snippet.replace(/<[^>]*>/g, '');
        if (answer.length > 800) answer = answer.slice(0, 800) + '...';
        io.emit('message', { from: 'MayorChatZ Assistant', to: from, text: `📚 ${bestTitle}\n\n${answer}\n\nSource: Wikipedia`, type: 'text' });
      } catch (e) { io.emit('message', { from: 'MayorChatZ Assistant', to: from, text: 'Network wahala, try again.', type: 'text' }); }
      return;
    }
    io.emit('message', msg);
  });
  socket.on('disconnect', () => { delete users[socket.id]; io.emit('onlineUsers', Object.values(users)); io.emit('userList', Object.values(users)); });
});
server.listen(PORT, () => console.log('MayorChatZ running on ' + PORT));
