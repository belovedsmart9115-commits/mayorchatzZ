const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ---------- SAVE SETTINGS SO REDEPLOY NO WIPE AM ----------
const DATA_FILE = path.join(__dirname, 'data.json');
let users = [], groups = [], statusList = [], messages = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    let d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    users = d.users || [];
    groups = d.groups || [];
    statusList = d.statusList || [];
    messages = d.messages || [];
  }
} catch (e) {}
function save() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify({ users, groups, statusList, messages })); } catch (e) {}
}
if (!groups.find(g => g.id === 'general')) {
  groups.push({ id: 'general', name: 'General Chat', desc: 'Everyone dey here', members: 0, createdBy: 'MayorChatZ' });
  save();
}

// ---------- UPLOAD: Photos + Videos up to 50MB ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: '/uploads/' + req.file.filename, fileType: req.file.mimetype });
});

// ---------- API ----------
app.post('/api/register', (req, res) => {
  let { name, id, publicKey } = req.body;
  if (!name ||!id) return res.status(400).json({ error: 'Missing' });
  let u = users.find(x => x.id === id);
  if (u) { u.name = name; u.publicKey = publicKey || u.publicKey; u.online = true; }
  else { u = { id, name, publicKey: publicKey || null, online: true }; users.push(u); }
  save(); io.emit('users-changed');
  res.json(u);
});
app.get('/api/users', (req, res) => res.json(users));
app.post('/api/groups', (req, res) => {
  let g = { id: 'g' + Date.now(), name: req.body.name, desc: req.body.desc || '', members: 1, createdBy: req.body.createdBy || '' };
  groups.push(g); save(); io.emit('new-group', g); res.json(g);
});
app.get('/api/groups', (req, res) => res.json(groups));
app.post('/api/status', (req, res) => {
  let s = { id: 's' + Date.now(), name: req.body.name || '', text: req.body.text || '', file: req.body.file || null, fileType: req.body.fileType || '', createdAt: Date.now() };
  statusList.unshift(s); save(); io.emit('new-status', s); res.json(s);
});
app.get('/api/status', (req, res) => res.json(statusList));
app.get('/api/messages', (req, res) => {
  let { from, to } = req.query;
  let m = messages.filter(x => (x.from === from && x.to === to) || (x.from === to && x.to === from));
  res.json(m);
});

// ---------- SMART ASSISTANT ----------
function smartReply(q) {
  let t = (q || '').toLowerCase().trim();
  let math = t.replace(/x/g, '*').match(/^[\d\s\+\-\*\/\(\)\.]+$/);
  if (math && /[0-9]/.test(t) && /[\+\-\*\/]/.test(t)) {
    try { let v = Function('return ' + t)(); if (typeof v === 'number' && isFinite(v)) return 'The answer is ' + v + '. ✅'; } catch (e) {}
  }
  if (t.includes('photosynthesis')) return 'Photosynthesis na how green plants use sunlight, water and carbon dioxide to make food (glucose) and release oxygen.\n\nEquation: 6CO2 + 6H2O + sunlight → C6H12O6 + 6O2\n\nIt happens inside chloroplasts, with chlorophyll. Na why plants green and why we get oxygen to breathe. 🌿';
  if (t.includes('gravity')) return 'Gravity na force wey dey pull objects toward each other. Earth gravity dey pull everything toward centre, na why things fall down. Newton discover am, Einstein explain am as bending of space-time.';
  if (t.includes('hello') || t === 'hi' || t.includes('how are you')) return 'Hello Boss! 👋 I dey fine, I be MayorChatZ Assistant. Ask me anything - science, maths, English, coding, or gist. Wetin you wan learn today?';
  if (t.includes('who are you') || t.includes('your name')) return 'I be MayorChatZ Assistant, your FREE AI inside MayorChatZ. I fit answer questions, explain topics, solve maths, and help you with homework.';
  if (t.includes('nigeria')) return 'Nigeria na the most populous country for Africa, with over 220 million people. Capital na Abuja, largest city na Lagos. E get 36 states + FCT, and over 500 languages.';
  if (t.includes('water') && t.includes('boil')) return 'Water dey boil at 100°C (212°F) at normal sea level pressure. For higher altitude, e dey boil at lower temperature because air pressure low.';
  if (t.includes('pythagoras')) return 'Pythagoras Theorem: For right triangle, a² + b² = c², where c na hypotenuse (longest side). Example: If a=3, b=4, then c=5 because 9+16=25.';
  if (t.includes('dna')) return 'DNA (Deoxyribonucleic Acid) na molecule wey carry genetic instructions for living things. E get double helix shape, with 4 bases: A, T, C, G. A pair with T, C pair with G.';
  if (t.includes('computer') || t.includes('what is ai')) return 'AI (Artificial Intelligence) na computer systems wey fit do tasks wey normally need human intelligence - like understand language, recognize images, and make decisions. Examples: ChatGPT, Google Translate, face unlock.';
  if (t.includes('thank')) return 'You are welcome Boss! 🙏 Anytime. Ask me another one.';
  if (t.includes('joke')) return 'Why did the scarecrow win an award? Because he was outstanding in his field! 😂';
  if (t.includes('capital of france')) return 'Capital of France na Paris. 🇫🇷';
  if (t.includes('capital of england') || t.includes('capital of uk')) return 'Capital of England / UK na London. 🇬🇧';
  if (t.includes('capital of ghana')) return 'Capital of Ghana na Accra. 🇬🇭';
  if (t.includes('largest planet')) return 'Largest planet for our solar system na Jupiter. E big pass all other planets combined.';
  if (t.includes('fastest animal')) return 'Fastest land animal na cheetah - e fit run up to 110 km/h. Fastest bird na peregrine falcon.';
  return 'Good question! "' + q + '"\n\nHere is how to think about am:\n1. Break am into small parts\n2. Define the key terms\n3. Look for example\n\nTell me more detail - e.g. "Explain ' + q + ' for SS2" or "Give example of ' + q + '" - make I give you full explanation with examples. 📚';
}
app.post('/chat', (req, res) => {
  let m = req.body.message || '';
  res.json({ reply: smartReply(m) });
});

// ---------- SOCKET ----------
io.on('connection', (socket) => {
  socket.on('join', (id, name) => {
    socket.userId = id;
    let u = users.find(x => x.id === id);
    if (u) { u.online = true; u.name = name || u.name; save(); }
    io.emit('online-users', users.filter(x => x.online).map(x => x.id));
    io.emit('users-changed');
  });
  socket.on('send-message', (data) => {
    let msg = {
      id: 'm' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      from: data.from, fromName: data.fromName || '', to: data.to,
      text: data.text || '', file: data.file || null, fileType: data.fileType || '',
      createdAt: Date.now()
    };
    messages.push(msg);
    if (messages.length > 2000) messages = messages.slice(-2000);
    save();
    io.emit('new-message', msg);
  });
  socket.on('disconnect', () => {
    let u = users.find(x => x.id === socket.userId);
    if (u) { u.online = false; save(); }
    io.emit('online-users', users.filter(x => x.online).map(x => x.id));
    io.emit('users-changed');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('MayorChatZ live on ' + PORT));
