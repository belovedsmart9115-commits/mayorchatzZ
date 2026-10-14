const express=require('express');const http=require('http');const{Server}=require('socket.io');const multer=require('multer');const path=require('path');const fs=require('fs');
const app=express();const server=http.createServer(app);const io=new Server(server,{cors:{origin:'*'}});
app.use(express.json({limit:'50mb'}));app.use(express.urlencoded({extended:true}));app.use(express.static(path.join(__dirname,'public')));app.use('/uploads',express.static(path.join(__dirname,'public/uploads')));
const DATA_FILE=path.join(__dirname,'data.json');let users=[],groups=[],statusList=[],messages=[];
try{if(fs.existsSync(DATA_FILE)){let d=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));users=d.users||[];groups=d.groups||[];statusList=d.statusList||[];messages=d.messages||[];}}catch(e){}
// MERGE DUPLICATES - Fix own name showing
let seen={};users=users.filter(u=>{let k=(u.name||'').toLowerCase().trim();if(!k||seen[k])return false;seen[k]=true;return true;});
function save(){try{fs.writeFileSync(DATA_FILE,JSON.stringify({users,groups,statusList,messages}));}catch(e){}}
if(!groups.find(g=>g.id==='general')){groups.push({id:'general',name:'General Chat',desc:'Everyone dey here',members:0,createdBy:'MayorChatZ'});save();}
const storage=multer.diskStorage({destination:(req,file,cb)=>{let dir=path.join(__dirname,'public/uploads');if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});cb(null,dir);},filename:(req,file,cb)=>{cb(null,Date.now()+'-'+Math.round(Math.random()*1e9)+path.extname(file.originalname));}});
const upload=multer({storage,limits:{fileSize:50*1024*1024}});
app.post('/api/upload',upload.single('file'),(req,res)=>{if(!req.file)return res.status(400).json({error:'No file'});res.json({url:'/uploads/'+req.file.filename,fileType:req.file.mimetype});});
app.post('/api/register',(req,res)=>{let{name,id,publicKey}=req.body;if(!name||!id)return res.status(400).json({error:'Missing'});let byName=users.find(x=>(x.name||'').toLowerCase().trim()===name.toLowerCase().trim());if(byName){byName.online=true;byName.publicKey=publicKey||byName.publicKey;save();io.emit('users-changed');return res.json(byName);}let u=users.find(x=>x.id===id);if(u){u.name=name;u.publicKey=publicKey||u.publicKey;u.online=true;}else{u={id,name,publicKey:publicKey||null,online:true};users.push(u);}save();io.emit('users-changed');res.json(u);});
app.get('/api/users',(req,res)=>res.json(users));
app.post('/api/groups',(req,res)=>{let g={id:'g'+Date.now(),name:req.body.name,desc:req.body.desc||'',members:1,createdBy:req.body.createdBy||''};groups.push(g);save();io.emit('new-group',g);res.json(g);});
app.get('/api/groups',(req,res)=>res.json(groups));
app.post('/api/status',(req,res)=>{let s={id:'s'+Date.now(),name:req.body.name||'',text:req.body.text||'',file:req.body.file||null,fileType:req.body.fileType||'',createdAt:Date.now()};statusList.unshift(s);save();io.emit('new-status',s);res.json(s);});
app.get('/api/status',(req,res)=>res.json(statusList));
app.get('/api/messages',(req,res)=>{let{from,to}=req.query;res.json(messages.filter(x=>(x.from===from&&x.to===to)||(x.from===to&&x.to===from)));});
function cleanTopic(q){let t=q.toLowerCase().trim();t=t.replace(/^(please\s+)?(explain|what is|what's|whats|who is|who's|define|tell me about|meaning of|describe)\s+/i,'');t=t.replace(/\?+$/g,'').trim();if(!t)t=q;return t;}
app.post('/chat',async(req,res)=>{let q=req.body.message||'';let t=q.toLowerCase().trim();
if(t.includes('hello')||t==='hi')return res.json({reply:'Hello Boss! 👋 I be MayorChatZ Assistant. Ask me anything - science, maths, history, geography, coding. Wetin you wan learn?'});
if(t.includes('who are you'))return res.json({reply:'I be MayorChatZ Assistant, your FREE AI inside MayorChatZ.'});
if(t.includes('photosynthesis'))return res.json({reply:'Photosynthesis na how green plants use sunlight, water and carbon dioxide to make food (glucose) and release oxygen.\n\nEquation: 6CO2 + 6H2O + sunlight → C6H12O6 + 6O2'});
let math=t.replace(/x/g,'*').match(/^[\d\s\+\-\*\/\(\)\.]+$/);if(math&&/[0-9]/.test(t)&&/[\+\-\*\/]/.test(t)){try{let v=Function('return '+t)();if(typeof v==='number'&&isFinite(v))return res.json({reply:'The answer is '+v+'. ✅'});}catch(e){}}
try{let topic=cleanTopic(q);let r=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(topic),{headers:{'User-Agent':'MayorChatZ/1.0'}});if(r.ok){let d=await r.json();if(d&&d.extract)return res.json({reply:d.title+'\n\n'+d.extract});}}catch(e){}
try{let topic=cleanTopic(q);let r=await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch='+encodeURIComponent(topic)+'&format=json&origin=*',{headers:{'User-Agent':'MayorChatZ/1.0'}});if(r.ok){let d=await r.json();let hit=d?.query?.search?.[0];if(hit){let r2=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(hit.title),{headers:{'User-Agent':'MayorChatZ/1.0'}});if(r2.ok){let d2=await r2.json();if(d2&&d2.extract)return res.json({reply:d2.title+'\n\n'+d2.extract});}}}}catch(e){}
return res.json({reply:'You asked: "'+q+'"\n\nTry ask like "What is '+cleanTopic(q)+'"'});});
io.on('connection',(socket)=>{socket.on('join',(id,name)=>{socket.userId=id;let u=users.find(x=>x.id===id)||users.find(x=>(x.name||'').toLowerCase()===(name||'').toLowerCase());if(u){u.online=true;u.name=name||u.name;save();}io.emit('online-users',users.filter(x=>x.online).map(x=>x.id));io.emit('users-changed');});
socket.on('send-message',(data)=>{let msg={id:'m'+Date.now()+'_'+Math.random().toString(36).slice(2,7),from:data.from,fromName:data.fromName||'',to:data.to,text:data.text||'',file:data.file||null,fileType:data.fileType||'',createdAt:Date.now()};messages.push(msg);if(messages.length>2000)messages=messages.slice(-2000);save();io.emit('new-message',msg);});
socket.on('disconnect',()=>{let u=users.find(x=>x.id===socket.userId);if(u){u.online=false;save();}io.emit('online-users',users.filter(x=>x.online).map(x=>x.id));io.emit('users-changed');});});
const PORT=process.env.PORT||3000;server.listen(PORT,()=>console.log('MayorChatZ live on '+PORT));
