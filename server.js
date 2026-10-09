const http = require('http');
let messages = [{user:'Mayor', text:'Welcome to MayorchatzZ! 🔥'}];

const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#111b21;color:#e9edef;font-family:sans-serif;display:flex;flex-direction:column;height:100vh}.header{background:#202c33;padding:15px;font-weight:bold;font-size:18px}.header span{color:#00a884}#chat{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}.msg{background:#202c33;padding:10px 12px;border-radius:8px;max-width:80%}.msg.me{background:#005c4b;align-self:flex-end}.msg b{color:#53bdeb;font-size:13px}.msg.me b{color:#86ff00}#form{display:flex;padding:10px;background:#202c33;gap:8px}#form input{flex:1;padding:12px;border-radius:8px;border:0;outline:0}#form button{background:#00a884;color:#fff;border:0;padding:0 18px;border-radius:8px;font-weight:bold}
</style></head><body><div class="header">Mayor<span>chatzZ</span></div><div id="chat"></div><form id="form"><input id="user" placeholder="Your name" style="max-width:120px"><input id="text" placeholder="Type message..." required><button>Send</button></form><script>
let chat=document.getElementById('chat');let userIn=document.getElementById('user');let textIn=document.getElementById('text');let form=document.getElementById('form');
function addMsg(m,me){let d=document.createElement('div');d.className='msg'+(me?' me':'');d.innerHTML='<b>'+m.user+'</b><br>'+m.text+'<br><small>'+(m.time||'')+'</small>';chat.appendChild(d);chat.scrollTop=chat.scrollHeight}
async function load(){let r=await fetch('/api/messages');let data=await r.json();chat.innerHTML='';data.forEach(m=>addMsg(m,m.user==userIn.value))} 
form.onsubmit=async(e)=>{e.preventDefault();if(!textIn.value)return;let msg={user:userIn.value||'Anon',text:textIn.value};addMsg({...msg,time:new Date().toLocaleTimeString()},true);textIn.value='';await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(msg)});load()};
setInterval(load,2000);load();
</script></body></html>`;

const server = http.createServer((req,res)=>{
if(req.url==='/api/messages' && req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(messages));return}
if(req.url==='/api/messages' && req.method==='POST'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{let j=JSON.parse(b);j.time=new Date().toLocaleTimeString();messages.push(j);if(messages.length>100)messages.shift();res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify({ok:true}))}catch(e){res.writeHead(400);res.end()}});return}
res.writeHead(200,{'Content-Type':'text/html'});res.end(html);
});
server.listen(process.env.PORT || 3000,()=>console.log('MayorchatzZ running on '+(process.env.PORT || 3000)));
