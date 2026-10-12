const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{
maxHttpBufferSize:52428800
});
app.use(express.static('public'));
let messages=[],statuses=[],groups=[],online=0;
io.on('connection',s=>{
online++;io.emit('online',online);
s.on('setName',n=>{s.username=n;});
s.emit('history',messages);
s.emit('statusHistory',statuses);
s.emit('groups',groups);
s.on('message',m=>{
m.mid=Date.now()+Math.random();
m.time=new Date().toLocaleTimeString();
m.ticks='✓✓';
messages.push(m);
if(messages.length>100)messages.shift();
io.emit('message',m);
});
s.on('deleteMsg',mid=>{
messages=messages.filter(x=>x.mid!=mid);
io.emit('deleteMsg',mid);
});
s.on('postStatus',st=>{
st.time=new Date().toLocaleTimeString();
statuses.push(st);
io.emit('newStatus',st);
});
s.on('createGroup',name=>{
let g={id:Date.now(),name};
groups.push(g);
io.emit('groups',groups);
});
s.on('disconnect',()=>{
online--;io.emit('online',online);
});
});
server.listen(10000,()=>console.log('Live'));
