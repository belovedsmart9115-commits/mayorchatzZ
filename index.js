const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));
let users=[], messages=[], statuses=[], online={}, typing={};
app.post('/api/signup',(req,res)=>{
  let u=req.body;
  if(!u.name||!u.phone||!u.password) return res.json({error:'fill'});
  if(users.find(x=>x.phone===u.phone)) return res.json({error:'exists'});
  users.push(u);
  res.json({ok:true});
});
app.post('/api/login',(req,res)=>{
  let u=users.find(x=>x.phone===req.body.phone&&x.password===req.body.password);
  if(!u) return res.json({error:'wrong'});
  res.json({name:u.name,avatar:u.avatar||'👤'});
});
app.get('/api/users',(req,res)=>res.json(users.map(u=>({name:u.name,avatar:u.avatar||'👤',phone:u.phone}))));
app.get('/api/messages',(req,res)=>res.json(messages));
app.post('/api/messages',(req,res)=>{
  messages.push({...req.body,time:new Date().toLocaleTimeString(),id:Date.now()});
  if(messages.length>500) messages.shift();
  res.json({ok:true});
});
app.get('/api/status',(req,res)=>res.json(statuses));
app.post('/api/status',(req,res)=>{
  statuses.push({...req.body,time:new Date().toLocaleTimeString(),id:Date.now()});
  res.json({ok:true});
});
app.get('/api/typing',(req,res)=>{
  let now=Date.now();
  let list=Object.keys(typing).filter(k=>now-typing[k]<3000);
  res.json(list);
});
app.post('/api/typing',(req,res)=>{typing[req.body.user]=Date.now();res.json({ok:true})});
app.get('/api/online',(req,res)=>{
  let now=Date.now();
  Object.keys(online).forEach(k=>{if(now-online[k]>15000) delete online[k]});
  res.json(Object.keys(online));
});
app.post('/api/online',(req,res)=>{online[req.body.user]=Date.now();res.json({ok:true})});
app.get('*',(req,res)=>res.sendFile(__dirname+'/public/index.html'));
let port=process.env.PORT||10000;
app.listen(port,()=>console.log('MayorChatZ LIVE on '+port));
