const express=require('express');
const app=express();
const path=require('path');
app.use(express.json({limit:'50mb'}));
app.use(express.static(path.join(__dirname,'public')));
let messages=[];
let online={};
let calls=[];
let status=[];
let groups=[{name:'General',members:[]}];

app.get('/api/messages',(req,res)=>{
  let g=req.query.group||'General';
  res.json(messages.filter(m=> (m.group||'General')==g));
});
app.post('/api/messages',(req,res)=>{
  let m={id:Date.now().toString(),name:req.body.name,text:req.body.text,type:req.body.type||'text',data:req.body.data||'',time:new Date().toLocaleTimeString(),group:req.body.group||'General'};
  messages.push(m);
  if(messages.length>200)messages.shift();
  res.json(m);
});
app.delete('/api/messages/:id',(req,res)=>{
  messages=messages.filter(m=>m.id!=req.params.id);
  res.json({ok:true});
});

app.get('/api/status',(req,res)=>{res.json(status.slice(-20));});
app.post('/api/status',(req,res)=>{
  status.push({id:Date.now().toString(),name:req.body.name,type:req.body.type,data:req.body.data,time:Date.now()});
  status=status.filter(s=>Date.now()-s.time < 24*60*60*1000);
  res.json({ok:true});
});

app.get('/api/groups',(req,res)=>res.json(groups));
app.post('/api/groups',(req,res)=>{
  groups.push({name:req.body.name,members:[]});
  res.json({ok:true});
});

app.post('/api/online',(req,res)=>{online[req.body.name]=Date.now();res.json({ok:true});});
app.get('/api/users',(req,res)=>{
  let now=Date.now();
  Object.keys(online).forEach(k=>{if(now-online[k]>10000)delete online[k];});
  res.json({count:Object.keys(online).length,list:Object.keys(online)});
});
app.get('/api/calls',(req,res)=>{
  let u=req.query.user;
  res.json(calls.filter(c=>c.to==u));
});
app.post('/api/calls',(req,res)=>{
  let c={id:Date.now().toString(),from:req.body.from,to:req.body.to,type:req.body.type,data:req.body.data,time:Date.now(),accepted:false};
  calls.push(c);
  res.json(c);
});
app.put('/api/calls/:id',(req,res)=>{
  let c=calls.find(x=>x.id==req.params.id);
  if(c)c.accepted=true;
  res.json({ok:true});
});
app.delete('/api/calls/:id',(req,res)=>{
  calls=calls.filter(c=>c.id!=req.params.id);
  res.json({ok:true});
});
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('MayorChatZ PRO Live '+PORT));
