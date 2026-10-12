const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let messages = [];
let users = {};
let statuses = [];
let groups = [{name:'General'}];

app.get('/api/messages', (req,res)=>{
  let g = req.query.group || 'General';
  res.json(messages.filter(m=>!m.group || m.group===g).slice(-100));
});

app.post('/api/messages', (req,res)=>{
  let m = {id:Date.now().toString(),...req.body, time:new Date().toLocaleTimeString()};
  messages.push(m);
  if(messages.length>500) messages.shift();
  res.json({ok:true});
});

app.delete('/api/messages/:id', (req,res)=>{
  messages = messages.filter(m=>m.id!== req.params.id);
  res.json({ok:true});
});

app.get('/api/users', (req,res)=>{
  let now = Date.now();
  Object.keys(users).forEach(k=>{ if(now-users[k]>15000) delete users[k] });
  res.json({count:Object.keys(users).length, list:Object.keys(users)});
});

app.post('/api/online', (req,res)=>{
  users[req.body.name] = Date.now();
  res.json({ok:true});
});

app.get('/api/status', (req,res)=> res.json(statuses.slice(-50)));

app.post('/api/status', (req,res)=>{
  statuses.push({id:Date.now().toString(),...req.body, time:new Date().toLocaleTimeString()});
  if(statuses.length>100) statuses.shift();
  res.json({ok:true});
});

app.get('/api/groups', (req,res)=> res.json(groups));

app.post('/api/groups', (req,res)=>{
  if(!groups.find(g=>g.name===req.body.name)) groups.push({name:req.body.name});
  res.json({ok:true});
});

app.get('*', (req,res)=> res.sendFile(path.join(__dirname,'public','index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('MayorChatZ PRO live on '+PORT));
