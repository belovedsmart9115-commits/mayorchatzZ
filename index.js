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

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
app.use('/uploads', express.static('uploads'));
app.use(express.static(__dirname));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g,'_'))
});
const upload = multer({ storage });

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const isVideo = req.file.mimetype.startsWith('video');
  res.json({ url: '/uploads/' + req.file.filename, type: isVideo? 'video' : 'image' });
});

let users = {}; // name -> socketId
let socketToName = {}; // socketId -> name

async function getAssistantReply(text) {
  let query = text.replace(/what is|who is|tell me about|explain/gi, '').trim();
  if (!query) query = text;
  try {
    const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(query));
    const d = await r.json();
    if (d.extract) return d.extract + (d.content_urls?.desktop?.page? '\n\nSource: ' + d.content_urls.desktop.page : '');
    return "I no find that one for Wikipedia. Try another question.";
  } catch (e) {
    return "Sorry, I no fit reach Wikipedia now. Try again.";
  }
}

io.on('connection', (socket) => {
  socket.on('join', (name) => {
    name = (name || '').trim();
    if (!name) return;
    if (users[name] && users[name]!== socket.id) {
      socket.emit('joinError', 'That name don dey use already. Choose another name.');
      return;
    }
    users[name] = socket.id;
    socketToName[socket.id] = name;
    socket.emit('joinSuccess', name);
    io.emit('onlineUsers', Object.keys(users));
    io.emit('userList', Object.keys(users));
  });

  socket.on('typing', (d) => {
    socket.broadcast.emit('typing', d);
  });

  socket.on('message', async (msg) => {
    msg.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Send to everyone (client filters by chat)
    io.emit('message', msg);

    // Assistant reply
    if (msg.to === 'MayorChatZ Assistant' && msg.from!== 'MayorChatZ Assistant') {
      let replyText = await getAssistantReply(msg.text || 'Hello');
      io.emit('message', { from: 'MayorChatZ Assistant', to: msg.from, text: replyText, type: 'text', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }
  });

  socket.on('disconnect', () => {
    let name = socketToName[socket.id];
    if (name) {
      delete users[name];
      delete socketToName[socket.id];
      io.emit('onlineUsers', Object.keys(users));
      io.emit('userList', Object.keys(users));
    }
  });
});

server.listen(PORT, () => console.log('MayorChatZ live on ' + PORT));
