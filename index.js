const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 50 * 1024 * 1024 });
app.use(express.static(path.join(__dirname, 'public')));
let messages=[], statuses=[], groups=[{id:1,name:'DE mayors Family'}];
let onlineUsers=new Map();
io.on('connection',(socket)=>{
  socket.on('setName',(name)=>{
    socket.username=name;
    onlineUsers.set(socket.id,name);
    io.emit('online',onlineUsers.size);
    socket.emit('history',messages);
    socket.emit('statusHistory',statuses);
    io.emit('groups',groups);
  });
  socket.on('message',(msg)=>{
    messages.push(msg);
    if(messages.length>200) messages.shift();
    io.emit('message',msg);
  });
  socket.on('typing',(name)=>{socket.broadcast.emit('typing',name);});
  socket.on('stopTyping',()=>{socket.broadcast.emit('stopTyping');});
  socket.on('deleteMsg',(id)=>{
    messages=messages.filter(m=>m.mid!=id);
    io.emit('deleteMsg',id);
  });
  socket.on('postStatus',(st)=>{
    statuses.unshift(st);
    if(statuses.length>50) statuses.pop();
    io.emit('newStatus',st);
  });
  socket.on('createGroup',(name)=>{
    groups.push({id:Date.now(),name});
    io.emit('groups',groups);
  });
  socket.on('disconnect',()=>{
    onlineUsers.delete(socket.id);
    io.emit('online',onlineUsers.size);
  });
});
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log('MayorChatZ PINK V10 LIVE '+PORT));
