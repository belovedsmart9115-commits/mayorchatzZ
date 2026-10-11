const express=require('express');
const app=express();
const PORT=process.env.PORT||3000;
app.use(express.json({limit:'30mb'}));
app.use(express.static('public'));
let users=[],messages=[],typing={},groups=[{id:'all',name:'General Chat',members:[]}],calls=[],statuses=[];

app.post('/api/signup',(req,res)=>{
 let{name,phone,password,avatar}=req.body;
 if(!name||!phone||!password) return res.json({error:'fill all'});
 if(users.find(u=>u.phone==phone)) return res.json({error:'Phone exists'});
 users.push({name,phone,password,avatar:avatar||'👤'});
 res.json({ok:true});
});
app.post('/api/login',(req,res)=>{
 let u=users.find(x=>x.phone==req.body.phone&&x.password==req.body.password);
 if(!u) return res.json({error:'Wrong'});
 res.json({name:u.name,avatar:u.avatar});
});
app.get('/api/users',(req,res)=>res.json(users.map(u=>({name:u.name,avatar:u.avatar}))));
app.get('/api/messages',(req,res)=>res.json(messages));
app.post('/api/messages',(req,res)=>{
 let m={id:Date.now().toString(),user:req.body.user,text:req.body.text||'',avatar:req.body.avatar||'👤',type:req.body.type||'text',data:req.body.data||'',chatTo:req.body.chatTo||req.body.to||'all',time:new Date().toLocaleTimeString(),readBy:[]};
 messages.push(m);
 if(messages.length>500) messages.shift();
 res.json({ok:true});
});
app.post('/api/typing',(req,res)=>{typing[req.body.user]=Date.now(); res.json({ok:true});});
app.get('/api/typing',(req,res)=>{let a=Object.keys(typing).filter(k=>Date.now()-typing[k]<3000); res.json(a);});
app.get('/api/status',(req,res)=>{
 statuses=statuses.filter(s=>Date.now()-s.tTime<86400000);
 res.json(statuses);
});
app.post('/api/status',(req,res)=>{
 let s={id:Date.now().toString(),user:req.body.user,avatar:req.body.avatar||'👤',text:req.body.text||'',data:req.body.data||'',time:new Date().toLocaleString(),views:[],tTime:Date.now()};
 statuses.push(s);
 res.json({ok:true});
});
app.post('/api/status/:id/view',(req,res)=>{
 let s=statuses.find(x=>x.id==req.params.id);
 if(s&&!s.views.includes(req.body.user)) s.views.push(req.body.user);
 res.json({ok:true});
});
app.get('/api/groups',(req,res)=>res.json(groups));
app.post('/api/groups',(req,res)=>{let id=Date.now().toString(); groups.push({id,name:req.body.name,members:[req.body.creator]}); res.json({id});});
app.post('/api/groups/:id/join',(req,res)=>{let g=groups.find(x=>x.id==req.params.id); if(g&&!g.members.includes(req.body.user)) g.members.push(req.body.user); res.json({ok:true});});
app.post('/api/call',(req,res)=>{let c={id:Date.now().toString(),from:req.body.from,toUser:req.body.to||req.body.toUser,type:req.body.type,data:req.body.data,time:Date.now()}; calls.push(c); if(calls.length>50) calls.shift(); res.json({ok:true});});
app.get('/api/call/:user',(req,res)=>{let my=calls.filter(c=>c.toUser==req.params.user&&Date.now()-c.time<30000); res.json(my);});
app.delete('/api/call/:id',(req,res)=>{calls=calls.filter(c=>c.id!=req.params.id); res.json({ok:true});});
app.listen(PORT,()=>console.log('CLEAN'));
