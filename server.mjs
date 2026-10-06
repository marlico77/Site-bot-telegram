import http from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {handle} from './lib/api.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||8787),host=process.env.HOST||'127.0.0.1';
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/icons.css':'icons.css','/logo.png':'logo.png','/icons/download.svg':'icons/download.svg','/icons/newspaper.svg':'icons/newspaper.svg','/icons/android.svg':'icons/android.svg','/icons/windows.svg':'icons/windows.svg'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://localhost:${port}`);
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/downloads/')){
   const result=await handle(new Request(url,{method:req.method}));
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
  }
  if(req.method!=='GET'||!files[url.pathname]){res.writeHead(404);res.end('Página não encontrada.');return;}
  const file=files[url.pathname],types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
  const content=readFileSync(path.join(root,'public',file));
  res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(content);
 }catch{res.writeHead(500);res.end('Não foi possível abrir a página.');}
}).listen(port,host,()=>console.log(`MarlicoBot: http://${host}:${port}`));
