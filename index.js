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

let serverMessages = [];
try { if (fs.existsSync('messages.json')) serverMessages = JSON.parse(fs.readFileSync('messages.json','utf8')||'[]'); } catch(e){ serverMessages=[]; }
function saveMessages(){ try{ fs.writeFileSync('messages.json', JSON.stringify(serverMessages.slice(-1000))); }catch(e){} }

let allUsers = [];
try { if (fs.existsSync('allUsers.json')) allUsers = JSON.parse(fs.readFileSync('allUsers.json','utf8')||'[]'); } catch(e){ allUsers=[]; }
function saveAllUsers(){ try{ fs.writeFileSync('allUsers.json', JSON.stringify(allUsers)); }catch(e){} }

let users = {};
let lastSeen = {};
function presenceList(){ return allUsers.map(n => ({ name:n, online: Object.values(users).includes(n), lastSeen: lastSeen[n] || null })); }

io.on('connection', (socket) => {
  socket.on('join', (name) => {
    if (!name ||!name.trim()) return;
    if (Object.values(users).includes(name)) { socket.emit('joinError', 'That name don dey use, try another name'); return; }
    socket.username = name; users[socket.id] = name;
    if (!allUsers.includes(name)) { allUsers.push(name); saveAllUsers(); }
    lastSeen[name] = Date.now();
    socket.emit('joinSuccess');
    socket.emit('statusList', serverStatuses);
    socket.emit('messageList', serverMessages);
    socket.emit('allUsers', presenceList());
    io.emit('onlineUsers', Object.values(users));
    io.emit('userList', Object.values(users));
    io.emit('allUsers', presenceList());
  });
  socket.on('typing', (d) => socket.broadcast.emit('typing', d));
  socket.on('newStatus', (s) => {
    if (!s.id) s.id = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    if (serverStatuses.find(x => x.id===s.id)) return;
    serverStatuses.unshift(s); serverStatuses = serverStatuses.slice(0, 100); saveStatuses();
    io.emit('statusNew', s);
  });
  socket.on('deleteStatus', (id) => {
    serverStatuses = serverStatuses.filter(s => s.id!== id && s.time!== id); saveStatuses();
    io.emit('statusList', serverStatuses);
  });
  socket.on('clearChat', (data) => {
    let chat = data.chat, me = data.user;
    // Clear for everybody for General Group, for private clear only that conversation
    if (chat === 'General Group') serverMessages = serverMessages.filter(m => m.to !== 'General Group');
    else serverMessages = serverMessages.filter(m => !((m.from===me && m.to===chat) || (m.from===chat && m.to===me)));
    saveMessages();
    io.emit('chatCleared', { chat, user: me });
  });
  socket.on('message', async (msg) => {
    let { from, to, text } = msg;
    if (!msg.id) msg.id = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    if (to === 'MayorChatZ Assistant') {
      let q = (text || '').trim(); let lower = q.toLowerCase();
      let replyText = '';
      if (lower.includes('hello') || lower === 'hi' || lower === 'hey') { replyText = 'Hello 💖! Ask me anything, e.g. Who is Wizkid? What is Nigeria?'; }
      else if (lower.includes('who are you')) { replyText = 'I be MayorChatZ Assistant 🤖💖 — I fit answer questions using Wikipedia.'; }
      else {
        let searchTerm = q.replace(/^(who is|what is|tell me about|what's|who's|explain)\s+/i, '').replace(/\?/g, '').trim() || q;
        try {
          let searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`);
          let searchData = await searchRes.json();
          if (!searchData.query ||!searchData.query.search.length) { replyText = `I no find "${q}" for Wikipedia. Try another word.`; }
          else {
            let bestTitle = searchData.query.search[0].title;
            let sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`);
            let sumData = await sumRes.json();
            let answer = sumData.extract || searchData.query.search[0].snippet.replace(/<[^>]*>/g, '');
            if (answer.length > 800) answer = answer.slice(0, 800) + '...';
            replyText = `📚 ${bestTitle}\n\n${answer}\n\nSource: Wikipedia`;
          }
        } catch (e) { replyText = 'Network wahala, try again.'; }
      }
      serverMessages.push(msg); serverMessages = serverMessages.slice(-1000); saveMessages();
      let reply = { id: Date.now()+'-a-'+Math.random().toString(36).slice(2,8), from: 'MayorChatZ Assistant', to: from, text: replyText, type: 'text' };
      serverMessages.push(reply); serverMessages = serverMessages.slice(-1000); saveMessages();
      io.emit('message', msg); io.emit('message', reply); return;
    }
    if (!serverMessages.find(x => x.id===msg.id)) { serverMessages.push(msg); serverMessages = serverMessages.slice(-1000); saveMessages(); }
    io.emit('message', msg);
  });
  socket.on('disconnect', () => {
    if (socket.username) lastSeen[socket.username] = Date.now();
    delete users[socket.id];
    io.emit('onlineUsers', Object.values(users));
    io.emit('userList', Object.values(users));
    io.emit('allUsers', presenceList());
  });
});
server.listen(PORT, () => console.log('MayorChatZ running on ' + PORT));
