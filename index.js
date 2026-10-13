const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const path=require('path');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{maxHttpBufferSize:50*1024*1024,cors:{origin:"*"}});
app.use(express.static(path.join(__dirname,'public')));
let messages=[],statuses=[],groups=[];
let users=new Map();

io.on('connection',socket=>{
  socket.on('setName',name=>{
    users.set(socket.id,{id:socket.id,name:name,online:true,lastSeen:Date.now()});
    io.emit('userList',Array.from(users.values()));
    io.emit('online',Array.from(users.values()).filter(u=>u.online).length);
    socket.emit('history',messages);
    socket.emit('statusHistory',statuses);
    socket.emit('groups',groups);
  });

  socket.on('message',m=>{
    messages.push(m);
    if(messages.length>200) messages.shift();
    io.emit('message',m);
  });

  socket.on('privateMessage',data=>{
    io.to(data.to).emit('privateMessage',data.msg);
    socket.emit('privateMessage',data.msg);
  });

  socket.on('postStatus',s=>{
    statuses.unshift(s);
    if(statuses.length>100) statuses.pop();
    io.emit('newStatus',s);
  });

  socket.on('createGroup',name=>{
    groups.push({id:Date.now(),name});
    io.emit('groups',groups);
  });

  socket.on('deleteMsg',id=>{
    messages=messages.filter(m=>m.mid!=id);
    io.emit('deleteMsg',id);
  });

  socket.on('typing',n=>socket.broadcast.emit('typing',n));
  socket.on('stopTyping',()=>socket.broadcast.emit('stopTyping'));
  socket.on('privateTyping',data=>{io.to(data.to).emit('privateTyping',data);});

  socket.on('disconnect',()=>{
    if(users.has(socket.id)){
      let u=users.get(socket.id);
      u.online=false;
      u.lastSeen=Date.now();
      users.set(socket.id,u);
      setTimeout(()=>{users.delete(socket.id); io.emit('userList',Array.from(users.values()));}, 1000*60*5); // delete after 5 mins offline
    }
    io.emit('userList',Array.from(users.values()));
    io.emit('online',Array.from(users.values()).filter(u=>u.online).length);
  });
});

const PORT=process.env.PORT||10000;
server.listen(PORT,()=>console.log('Live '+PORT));
