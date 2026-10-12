const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

let messages = [];
let online = 0;

app.get('/', (req,res)=> res.sendFile(path.join(__dirname, 'public', 'index.html')));

io.on('connection', socket => {
  online++;
  io.emit('online', online);
  socket.emit('history', messages);

  socket.on('message', data => {
    const msg = {
      mid: Date.now() + Math.random(), // unique id for delete
      text: data.text,
      id: socket.id,
      time: new Date().toLocaleTimeString(),
      ticks: '✓✓'
    };
    messages.push(msg);
    io.emit('message', msg); // send to ALL once
  });

  socket.on('deleteMsg', mid => {
    messages = messages.filter(m => m.mid !== mid);
    io.emit('deleteMsg', mid);
  });

  socket.on('disconnect', () => {
    online--; io.emit('online', online);
  });
});

server.listen(process.env.PORT||10000, '0.0.0.0', ()=>console.log('MayorChatZ LIVE'));
