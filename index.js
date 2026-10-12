const express=require('express'),http=require('http'),{Server}=require('socket.io');
const app=express(),server=http.createServer(app);
const io=new Server(server,{cors:{origin:"*"},maxHttpBufferSize:1e7});
app.use(express.static('public'));
let messages=[],statuses=[],online=0,groups=[{id:'general',name:'General Group'}];
io.on('connection',socket=>{
  online++; io.emit('online',online);
  socket.emit('history',messages);
  socket.emit('statusHistory',statuses);
  socket.emit('groups',groups);
  socket.on('setName',n=>{socket.data.name=n});
  socket.on('message',d=>{
    const msg={mid:Date.now()+Math.random(),id:socket.id,name:d.name||socket.data.name||'Anon',text:d.text||'',image:d.image||'',time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),ticks:'✓✓'};
    messages.push(msg); if(messages.length>200)messages.shift();
    io.emit('message',msg);
  });
  socket.on('deleteMsg',mid=>{messages=messages.filter(m=>m.mid!=mid); io.emit('deleteMsg',mid);});
  socket.on('postStatus',d=>{
    const s={id:Date.now(),name:d.name||socket.data.name,text:d.text||'',image:d.image||'',time:new Date().toLocaleTimeString()};
    statuses.push(s); if(statuses.length>50)statuses.shift();
    io.emit('newStatus',s);
  });
  socket.on('createGroup',name=>{
    const g={id:Date.now().toString(),name}; groups.push(g); io.emit('groups',groups);
  });
  socket.on('disconnect',()=>{online--; io.emit('online',online);});
});
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log('MayorChatZ V4 Live on '+PORT));
