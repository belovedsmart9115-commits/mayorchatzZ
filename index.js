const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let online = 0;

io.on('connection', socket => {
  online++;
  io.emit('online', online);
  console.log('User connected', socket.id);

  socket.on('join', room => {
    socket.join(room);
  });

  // THIS IS THE FIX FOR YOUR MESSAGE
  socket.on('message', data => {
    // data = {room, text, image}
    io.to(data.room).emit('message', {
      text: data.text,
      image: data.image || null,
      id: socket.id,
      time: new Date().toLocaleTimeString()
    });
  });

  socket.on('disconnect', () => {
    online--;
    io.emit('online', online);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('MayorChatZ running on', PORT));
