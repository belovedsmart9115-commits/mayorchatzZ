const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

let users = [{name:"DE mayors 👑", phone:"07088347232", password:"1234"}];
let messages = [];
let online = {};

app.use((req,res,next)=>{
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","Content-Type");
  res.header("Access-Control-Allow-Methods","GET,POST");
  next();
});

app.get('/api/users', (req,res)=> res.json({count: users.length, users: users.map(u=>({name:u.name, phone:u.phone}))}));
app.get('/api/messages', (req,res)=> res.json(messages));
app.post('/api/messages', (req,res)=>{
  const {name,text} = req.body;
  if(!text) return res.json({ok:false});
  messages.push({name,text,time:new Date().toLocaleTimeString(), id: Date.now()});
  if(messages.length>100) messages.shift();
  res.json({ok:true});
});

app.post('/api/signup', (req,res)=>{
  const {name,phone,password} = req.body;
  if(!name||!phone||!password) return res.json({ok:false, msg:"Fill all"});
  if(users.find(u=>u.phone===phone)) return res.json({ok:false, msg:"Phone already used"});
  users.push({name,phone,password});
  console.log("New user:", name, phone);
  res.json({ok:true});
});

app.post('/api/login', (req,res)=>{
  const {phone,password} = req.body;
  const u = users.find(u=>u.phone===phone && u.password===password);
  if(!u) return res.json({ok:false, msg:"Wrong phone/password"});
  res.json({ok:true, user:u});
});

app.get('/', (req,res)=>{
 res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>MayorChat</title><style>body{margin:0;background:#111b21;color:#fff;font-family:sans-serif} .box{max-width:400px;margin:40px auto;background:#202c33;padding:20px;border-radius:12px} input{width:100%;padding:12px;margin:8px 0;border-radius:8px;border:none} button{width:100%;padding:12px;background:#25d366;border:none;border-radius:8px;font-weight:bold;font-size:16px;cursor:pointer} button:disabled{background:gray} #app{display:none} .msg{padding:8px;margin:4px;background:#2a3942;border-radius:8px} </style></head><body>
<div id="auth" class="box"><h2>MayorChatZ 👑</h2><div id="err" style="color:#ff5c5c"></div><input id="name" placeholder="Name"><input id="phone" placeholder="Phone e.g 080..."><input id="pass" type="password" placeholder="Password"><button id="btn1" onclick="signup()">Sign Up - Click Once Wait</button><button style="margin-top:10px;background:#111;color:#25d366;border:1px solid #25d366" onclick="showLogin()">Already have? Login</button></div>
<div id="login" class="box" style="display:none"><h2>Login 👑</h2><div id="err2" style="color:#ff5c5c"></div><input id="lphone" placeholder="Phone"><input id="lpass" type="password" placeholder="Password"><button id="btn2" onclick="login()">Login</button><button style="margin-top:10px;background:#111;color:#25d366;border:1px solid #25d366" onclick="showSignup()">No account? Signup</button></div>
<div id="app"><div style="background:#202c33;padding:10px;display:flex;justify-content:space-between"><b id="uname">DE mayors 👑</b><button onclick="logout()" style="width:auto;padding:5px 15px">Logout</button></div><div style="padding:10px"><div>General Group 🌍 <span id="online">1 online</span> <button onclick="share()" style="width:auto;background:#25d366;padding:5px 15px;border-radius:20px">Invite</button></div><div id="chat" style="height:60vh;overflow-y:auto;margin-top:10px"></div><div style="display:flex;gap:5px;margin-top:10px"><input id="msg" placeholder="Type message" style="flex:1"><button onclick="send()" style="width:80px">Send</button></div><button onclick="share()" style="margin-top:10px">Share App to Friends 🔗</button></div></div>
<script>
let cur=null;
function showLogin(){document.getElementById('auth').style.display='none';document.getElementById('login').style.display='block'}
function showSignup(){document.getElementById('login').style.display='none';document.getElementById('auth').style.display='block'}
async function signup(){
 const b=document.getElementById('btn1'); b.disabled=true; b.innerText='Wait... Creating...';
 const name=document.getElementById('name').value.trim();
 const phone=document.getElementById('phone').value.trim();
 const password=document.getElementById('pass').value.trim();
 if(!name||!phone||!password){document.getElementById('err').innerText='Fill all fields'; b.disabled=false; b.innerText='Sign Up - Click Once Wait'; return}
 try{
  const r=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone,password})});
  const d=await r.json();
  if(!d.ok){document.getElementById('err').innerText=d.msg; b.disabled=false; b.innerText='Sign Up'; return}
  localStorage.setItem('mayor_user',JSON.stringify({name,phone})); cur={name,phone}; enter();
 }catch(e){document.getElementById('err').innerText='Network slow, wait 60s and try again - server dey wake'; b.disabled=false; b.innerText='Try Again'}
}
async function login(){
 const b=document.getElementById('btn2'); b.disabled=true; b.innerText='Wait...';
 const phone=document.getElementById('lphone').value.trim();
 const password=document.getElementById('lpass').value.trim();
 try{
  const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,password})});
  const d=await r.json();
  if(!d.ok){document.getElementById('err2').innerText=d.msg; b.disabled=false; b.innerText='Login'; return}
  localStorage.setItem('mayor_user',JSON.stringify(d.user)); cur=d.user; enter();
 }catch(e){document.getElementById('err2').innerText='Network slow, wait and try again'; b.disabled=false; b.innerText='Login'}
}
function enter(){
 document.getElementById('auth').style.display='none';document.getElementById('login').style.display='none';document.getElementById('app').style.display='block';
 document.getElementById('uname').innerText=cur.name; load(); setInterval(load,2000);
}
async function load(){
 try{
  const m=await (await fetch('/api/messages')).json();
  const c=document.getElementById('chat'); c.innerHTML=m.map(x=>'<div class=msg><b>'+x.name+':</b> '+x.text+'<br><small>'+x.time+'</small></div>').join(''); c.scrollTop=c.scrollHeight;
  const u=await (await fetch('/api/users')).json(); document.getElementById('online').innerText=u.count+' online';
 }catch(e){}
}
async function send(){
 const t=document.getElementById('msg').value.trim(); if(!t) return; document.getElementById('msg').value='';
 await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:cur.name,text:t})}); load();
}
function logout(){localStorage.removeItem('mayor_user'); location.reload()}
function share(){navigator.clipboard.writeText(location.href); alert('Link copied! Share to friend: '+location.href)}
window.onload=()=>{const s=localStorage.getItem('mayor_user'); if(s){cur=JSON.parse(s); enter()}}
</script></body></html>`);
});

app.listen(PORT, ()=> console.log("MayorChat running on", PORT));
