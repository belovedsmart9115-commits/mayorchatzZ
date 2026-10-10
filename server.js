const express=require('express');
const path=require('path');
const fs=require('fs');
const app=express();
const PORT=process.env.PORT||10000;
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
const MF=path.join(__dirname,'messages.json');
const UF=path.join(__dirname,'users.json');
function readJ(f,d){try{if(!fs.existsSync(f))return d;return JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){return d;}}
function writeJ(f,d){fs.writeFileSync(f,JSON.stringify(d,null,2));}
let typing={};
app.get('/api/messages',(req,res)=>{res.json(readJ(MF,[]));});
app.get('/api/users',(req,res)=>{let u=readJ(UF,[]);res.json(u.map(x=>({name:x.name,avatar:x.avatar||'👤',lastSeen:x.lastSeen||'now'})));});
app.get('/api/typing',(req,res)=>{let now=Date.now();let active=Object.keys(typing).filter(k=>now-typing[k]<3000);res.json(active);});
app.post('/api/typing',(req,res)=>{typing[req.body.user]=Date.now();res.json({ok:true});});
app.post('/api/messages',(req,res)=>{const{user,text,time,avatar}=req.body;const m=readJ(MF,[]);const id=Date.now().toString();m.push({id,user,text,time:time||new Date().toLocaleTimeString(),avatar:avatar||'👤'});if(m.length>500)m.shift();writeJ(MF,m);res.json({ok:true});});
app.delete('/api/messages/:id',(req,res)=>{let m=readJ(MF,[]);m=m.filter(x=>x.id!==req.params.id);writeJ(MF,m);res.json({ok:true});});
app.post('/api/signup',(req,res)=>{const{name,phone,password,avatar}=req.body;let u=readJ(UF,[]);if(u.find(x=>x.phone===phone))return res.status(400).json({error:'exists'});u.push({name,phone,password,avatar:avatar||'👤',lastSeen:new Date().toLocaleTimeString()});writeJ(UF,u);res.json({ok:true});});
app.post('/api/login',(req,res)=>{const{phone,password}=req.body;let u=readJ(UF,[]);let user=u.find(x=>x.phone===phone&&x.password===password);if(!user)return res.status(400).json({error:'wrong'});user.lastSeen=new Date().toLocaleTimeString();writeJ(UF,u);res.json({ok:true,name:user.name,avatar:user.avatar});});
app.get('/*splat',(req,res)=>{res.sendFile(path.join(__dirname,'public','index.html'));});
app.listen(PORT,()=>console.log('ULTRA LIVE '+PORT));
