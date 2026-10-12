const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:"*"},maxHttpBufferSize:1e7});
app.use(express.static('public'));
let messages=[],statuses=[],groups=[{id:'gen',name:'General'}];
let online=0;
io.on('connection',socket=>{
 online++; io.emit('online',online);
 socket.emit('history',messages);
 socket.emit('statusHistory',statuses);
 socket.emit('groups',groups);
 socket.on('setName',n=>{socket.data.name=n});
 socket.on('message',d=>{
  const m={mid:Date.now()+Math.random(),id:socket.id,name:d.name||socket.data.name||'Anon',text:d.text||'',image:d.image||'',time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),ticks:'✓✓'};
  messages.push(m); if(messages.length>200)messages.shift();
  io.emit('message',m);
 });
 socket.on('deleteMsg',mid=>{messages=messages.filter(x=>x.mid!=mid); io.emit('deleteMsg',mid);});
 socket.on('postStatus',d=>{
  const s={id:Date.now(),name:d.name||socket.data.name,text:d.text||'',image:d.image||'',time:new Date().toLocaleTimeString()};
  statuses.push(s); io.emit('newStatus',s);
 });
 socket.on('createGroup',name=>{
  const g={id:Date.now().toString(),name}; groups.push(g); io.emit('groups',groups);
 });
 socket.on('disconnect',()=>{online--; io.emit('online',online);});
});
server.listen(process.env.PORT||3000,()=>console.log('MayorChatZ V4 Live'));
