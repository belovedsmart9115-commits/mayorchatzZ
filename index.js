const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 10e6 });

app.use(express.static(path.join(__dirname,'public')));
app.use(express.static(__dirname));

let messages=[]; let statuses=[]; let online=0;

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'public','index.html')));

io.on('connection', s=>{
  online++; io.emit('online',online);
  s.emit('history',messages); s.emit('statusHistory',statuses);
  s.on('setName', n=> s.username=n);
  s.on('message', d=>{
    const m={mid:Date.now()+Math.random(), text:d.text||'', image:d.image||null, name:d.name||s.username||'Anon', id:s.id, time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), ticks:'✓✓'};
    messages.push(m); if(messages.length>200) messages.shift();
    io.emit('message',m);
  });
  s.on('postStatus', d=>{
    const st={sid:Date.now()+Math.random(), text:d.text||'', image:d.image||null, name:d.name||s.username||'Anon', time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
    statuses.unshift(st); if(statuses.length>50) statuses.pop();
    io.emit('newStatus',st);
  });
  s.on('deleteMsg', mid=>{ messages=messages.filter(m=>m.mid!==mid); io.emit('deleteMsg',mid); });
  s.on('disconnect',()=>{ online--; io.emit('online',online); });
});
server.listen(process.env.PORT||10000,'0.0.0.0',()=>console.log('V2 LIVE'));
