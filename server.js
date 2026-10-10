const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const MF = path.join(__dirname, 'messages.json');
const UF = path.join(__dirname, 'users.json');
function readJ(f,d){try{if(!fs.existsSync(f))return d;return JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){return d;}}
function writeJ(f,d){fs.writeFileSync(f,JSON.stringify(d,null,2));}
app.get('/api/messages',(req,res)=>{res.json(readJ(MF,[]));});
app.get('/api/users',(req,res)=>{let u=readJ(UF,[]);res.json(u.map(x=>({name:x.name})));});
app.post('/api/messages',(req,res)=>{const{user,text,time}=req.body;const m=readJ(MF,[]);m.push({user,text,time:time||new Date().toLocaleTimeString()});if(m.length>500)m.shift();writeJ(MF,m);res.json({ok:true});});
app.post('/api/signup',(req,res)=>{const{name,phone,password}=req.body;let u=readJ(UF,[]);if(u.find(x=>x.phone===phone))return res.status(400).json({error:'exists'});u.push({name,phone,password});writeJ(UF,u);res.json({ok:true});});
app.post('/api/login',(req,res)=>{const{phone,password}=req.body;let u=readJ(UF,[]);let user=u.find(x=>x.phone===phone&&x.password===password);if(!user)return res.status(400).json({error:'wrong'});res.json({ok:true,name:user.name});});
app.get('/*splat',(req,res)=>{res.sendFile(path.join(__dirname,'public','index.html'));});
app.listen(PORT,()=>console.log('live on '+PORT));
