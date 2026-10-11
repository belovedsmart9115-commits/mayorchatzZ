const express = require('express');
const app = express();
const path = require('path');
app.use(express.json());
app.use(express.static('public'));

let users = []; // {name, phone, password, avatar}
let messages = [];
let statuses = [];
let online = {}; // name -> lastSeen timestamp
let typing = {};

app.post('/api/signup',(req,res)=>{
  let {name,phone,password,avatar} = req.body;
  if(!name||!phone||!password) return res.json({error:'fill'});
  if(users.find(u=>u.phone===phone)) return res.json({error:'exists'});
  users.push({name,phone,password,avatar:avatar||'👤'});
  res.json({ok:true});
});

app.post('/api/login',(req,res)=>{
  let {phone,password}=req.body;
  let u = users.find(x=>x.phone===phone && x.password===password);
  if(!u) return res.json({error:'wrong'});
  res.json({name:u.name, avatar:u.avatar});
});

app.get('/api/users',(req,res)=>res.json(users.map(u=>({name:u.name, avatar:u.avatar, phone:u.phone}))));

app.post('/api/messages',(req,res)=>{
  let {user,avatar,text,dest} = req.body;
  messages.push({user,avatar,text,dest:dest||'all',time:new Date().toLocaleTimeString(), id:Date.now()});
  if(messages.length>500) messages.shift();
  res.json({ok:true});
});
app.get('/api/messages',(req,res)=>res.json(messages));

app.post('/api/status',(req,res)=>{
  statuses.push({...req.body, time:new Date().toLocaleTimeString(), id:Date.now(), views:[]});
  res.json({ok:true});
});
app.get('/api/status',(req,res)=>res.json(statuses));
app.post('/api/status/:id/view',(req,res)=>{
  let s=statuses.find(x=>x.id==req.params.id);
  if(s &&!s.views.includes(req.body.user)) s.views.push(req.body.user);
  res.json({ok:true});
});

app.post('/api/typing',(req,res)=>{
  typing[req.body.user]=Date.now();
  res.json({ok:true});
});
app.get('/api/typing',(req,res)=>{
  let now=Date.now();
  let list=Object.keys(typing).filter(u=>now-typing[u]<3000);
  res.json(list);
});

app.post('/api/online',(req,res)=>{
  online[req.body.user]=Date.now();
  res.json({ok:true});
});
app.get('/api/online',(req,res)=>{
  let now=Date.now();
  Object.keys(online).forEach(u=>{if(now-online[u]>10000) delete online[u]});
  res.json(Object.keys(online));
});

app.get('/api/groups',(req,res)=>res.json([{id:'all',name:'General Group 🌍'}]));

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

app.listen(process.env.PORT||10000, ()=>console.log('MayorChatZ LIVE 👑'));
