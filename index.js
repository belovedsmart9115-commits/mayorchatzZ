const express=require('express');
const app=express();
const PORT=process.env.PORT||10000;
app.use(express.json({limit:'15mb'}));
let users=[{name:"DE mayors 👑",phone:"07088347232",password:"1234"}];
let messages=[];let statuses=[];let online={};let typing={};
app.use((req,res,next)=>{res.header("Access-Control-Allow-Origin","*");res.header("Access-Control-Allow-Headers","Content-Type");res.header("Access-Control-Allow-Methods","GET,POST");next();});
app.get('/api/users',(req,res)=>{let now=Date.now();let list=Object.keys(online).filter(k=>now-online[k]<15000);res.json({count:list.length,list});});
app.post('/api/online',(req,res)=>{if(req.body.name)online[req.body.name]=Date.now();res.json({ok:true});});
app.get('/api/typing',(req,res)=>{let now=Date.now();let who=Object.keys(typing).filter(k=>now-typing[k]<3000);res.json(who);});
app.post('/api/typing',(req,res)=>{typing[req.body.name]=req.body.isTyping?Date.now():0;res.json({ok:true});});
app.get('/api/messages',(req,res)=>res.json(messages));
app.get('/api/status',(req,res)=>res.json(statuses));
app.post('/api/messages',(req,res)=>{messages.push({name:req.body.name,text:req.body.text||"",type:req.body.type||"text",data:req.body.data||"",time:new Date().toLocaleTimeString(),id:Date.now()});if(messages.length>200)messages.shift();res.json({ok:true});});
app.post('/api/status',(req,res)=>{statuses.unshift({name:req.body.name,text:req.body.text||"",time:new Date().toLocaleTimeString()});if(statuses.length>30)statuses.pop();res.json({ok:true});});
app.post('/api/signup',(req,res)=>{if(users.find(u=>u.phone===req.body.phone))return res.json({ok:false,msg:"Phone used"});users.push(req.body);res.json({ok:true});});
app.post('/api/login',(req,res)=>{let u=users.find(u=>u.phone===req.body.phone&&u.password===req.body.password);if(!u)return res.json({ok:false,msg:"Wrong pass, try 1234"});res.json({ok:true,user:u});});
app.get('/',(req,res)=>{
res.send(`
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>MayorChatZ</title><style>body{margin:0;background:#111b21;color:#fff;font-family:sans-serif}.box{max-width:400px;margin:40px auto;background:#202c33;padding:20px;border-radius:12px}input{width:100%;padding:12px;margin:6px 0;border-radius:8px;border:none}button{padding:12px;background:#25d366;border:none;border-radius:8px;font-weight:bold;width:100%}#app{display:none}.msg{padding:8px;margin:5px;background:#2a3942;border-radius:8px}.mine{background:#005c4b}.top{display:flex;justify-content:space-between;padding:10px;background:#202c33}.tabs{display:flex;gap:6px;padding:8px}.tab{padding:6px 10px;background:#2a3942;border-radius:15px;cursor:pointer}.active{background:#25d366;color:#000}</style></head><body>
<div id="auth" class="box"><h2>MayorChatZ 👑</h2><div id="err" style="color:red"></div><input id="name" placeholder="Name"><input id="phone" placeholder="Phone"><input id="pass" type="password" placeholder="Pass"><button onclick="signup()">Sign Up</button><button style="margin-top:8px;background:#111;color:#25d366;border:1px solid #25d366" onclick="showL()">Login</button></div>
<div id="login" class="box" style="display:none"><h2>Login</h2><div id="err2" style="color:red"></div><input id="lphone" placeholder="Phone"><input id="lpass" type="password" placeholder="Pass"><button onclick="login()">Login</button><button style="margin-top:8px;background:#111;color:#25d366;border:1px solid #25d366" onclick="showS()">Signup</button></div>
<div id="app"><div class="top"><b id="uname"></b><span id="online"></span><button onclick="logout()" style="width:70px">Out</button></div><div class="tabs"><div class="tab active" id="tchat" onclick="tab('chat')">Chats</div><div class="tab" id="tstatus" onclick="tab('status')">Status</div><div class="tab" id="tonline" onclick="tab('online')">Online</div></div>
<div id="viewChat"><div id="chat" style="height:50vh;overflow:auto;padding:10px"></div><div style="display:flex;gap:4px;padding:10px"><input id="msg" placeholder="Type..."><input type="file" id="img" accept="image/*" style="display:none" onchange="sendImg(this)"><button style="width:45px" onclick="document.getElementById('img').click()">📷</button><button style="width:45px" id="mic" onclick="voice()">🎤</button><button style="width:60px" onclick="send()">Send</button></div></div>
<div id="viewStatus" style="display:none;padding:10px"><input id="stxt" placeholder="Post status..."><button onclick="postS()">Post</button><div id="slist"></div></div>
<div id="viewOnline" style="display:none;padding:10px"><div id="olist"></div></div>
</div>
<script>
let cur=null;let rec=null;let chunks=[];let isRec=false;
function showL(){auth.style.display='none';login.style.display='block'}function showS(){login.style.display='none';auth.style.display='block'}
async function signup(){let n=name.value;let p=phone.value;let pw=pass.value;let r=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,phone:p,password:pw})});let d=await r.json();if(!d.ok){err.innerText=d.msg;return}localStorage.setItem('mayor_user',JSON.stringify({name:n,phone:p}));cur={name:n};enter()}
async function login(){let p=lphone.value;let pw=lpass.value;let r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:p,password:pw})});let d=await r.json();if(!d.ok){err2.innerText=d.msg;return}localStorage.setItem('mayor_user',JSON.stringify(d.user));cur=d.user;enter()}
function enter(){auth.style.display='none';login.style.display='none';app.style.display='block';uname.innerText=cur.name;load();setInterval(load,2000);setInterval(()=>fetch('/api/online',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:cur.name})}),3000)}
async function load(){let m=await (await fetch('/api/messages')).json();chat.innerHTML=m.map(x=>{let c=x.name===cur.name?'msg mine':'msg';let ex='';if(x.type==='image')ex='<br><img style=max-width:100%;border-radius:8px src='+x.data+'>';if(x.type==='voice')ex='<br><audio controls src='+x.data+'></audio>';return '<div class='+c+'><b>'+x.name+':</b> '+x.text+ex+'<br><small>'+x.time+'</small></div>'}).join('');chat.scrollTop=chat.scrollHeight;let u=await (await fetch('/api/users')).json();online.innerText=u.count+' online';olist.innerHTML=u.list.map(n=>'<div class=msg>🟢 '+n+'</div>').join('');let s=await (await fetch('/api/status')).json();slist.innerHTML=s.map(x=>'<div class=msg><b>'+x.name+':</b> '+x.text+'<br><small>'+x.time+'</small></div>').join('')}
async function send(){let t=msg.value;if(!t)return;msg.value='';await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:cur.name,text:t})});load()}
async function sendImg(i){let f=i.files[0];let rd=new FileReader();rd.onload=async e=>{await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:cur.name,text:'📷',type:'image',data:e.target.result})});load()};rd.readAsDataURL(f)}
async function postS(){let t=stxt.value;if(!t)return;stxt.value='';await fetch('/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:cur.name,text:t})});load()}
async function voice(){let b=document.getElementById('mic');if(!isRec){let st=await navigator.mediaDevices.getUserMedia({audio:true});rec=new MediaRecorder(st);chunks=[];rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=async()=>{let blob=new Blob(chunks,{type:'audio/webm'});let rd=new FileReader();rd.onload=async e=>{await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:cur.name,text:'🎤',type:'voice',data:e.target.result})});load()};rd.readAsDataURL(blob)};rec.start();isRec=true;b.innerText='⏹️'}else{rec.stop();isRec=false;b.innerText='🎤'}}
function tab(v){viewChat.style.display=v==='chat'?'block':'none';viewStatus.style.display=v==='status'?'block':'none';viewOnline.style.display=v==='online'?'block':'none';tchat.className=v==='chat'?'tab active':'tab';tstatus.className=v==='status'?'tab active':'tab';tonline.className=v==='online'?'tab active':'tab'}
function logout(){localStorage.clear();location.reload()}
let saved=localStorage.getItem('mayor_user');if(saved){cur=JSON.parse(saved);enter()}
<\/script></body></html>
`);
});
app.listen(PORT,()=>console.log("MayorChat Fixed"));
