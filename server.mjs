import http from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||8787),host=process.env.HOST||'127.0.0.1';
// Separate from the repository containing this website's source code.
const repo=(process.env.RELEASES_REPOSITORY||'').trim();
if(repo&&!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error('RELEASES_REPOSITORY deve ser dono/repositorio.');
const origin=(process.env.PUBLIC_URL||`http://localhost:${port}`).replace(/\/$/,'');
const token=process.env.GITHUB_TOKEN,base=`https://api.github.com/repos/${repo}`;
let cache=null,pending=null,retryAfter=0;
function problem(status,message){return Object.assign(Error(message),{status});}
async function github(url,binary=false){
 const headers={'User-Agent':'MarlicoBot-Updates','Accept':binary?'application/octet-stream':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization=`Bearer ${token}`;
 let response=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(binary&&[301,302,303,307,308].includes(response.status)){
  const location=new URL(response.headers.get('location'),url);
  if(location.protocol!=='https:'||!(location.hostname==='github.com'||location.hostname.endsWith('.githubusercontent.com')))throw Error('Destino inválido.');
  response=await fetch(location,{redirect:'error',signal:AbortSignal.timeout(120000)});
 }
 if(!response.ok)throw problem(503,'As versões estão temporariamente indisponíveis.');
 return response;
}
async function limitedJSON(response,max){let length=0,chunks=[];for await(const chunk of response.body){length+=chunk.length;if(length>max)throw Error('Metadados excedem o limite.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
async function refresh(){
 const release=await limitedJSON(await github(base+'/releases/latest'),2*1024*1024);
 if(release.draft||release.prerelease)throw Error('Release não estável.');
 const manifest=release.assets?.find(a=>a.name==='updates.json'&&a.state==='uploaded');
 if(!manifest||!Number.isSafeInteger(manifest.id)||manifest.size>65536)throw Error('Manifesto ausente ou inválido.');
 const spec=await limitedJSON(await github(`${base}/releases/assets/${manifest.id}`,true),65536);
 if(spec.schemaVersion!==1||!spec.platforms)throw Error('Manifesto incompatível.');
 const releases=[];
 for(const platform of ['android','windows']){
  const entry=spec.platforms[platform];if(!entry)continue;
  if(!/^\d+\.\d+\.\d+$/.test(entry.version)||!Number.isSafeInteger(entry.build)||entry.build<1||!Number.isSafeInteger(entry.minimumBuild)||entry.minimumBuild<0||entry.minimumBuild>entry.build)throw Error('Compilação inválida.');
  const asset=release.assets.find(a=>a.name===entry.asset&&a.state==='uploaded');
  if(!asset||!Number.isSafeInteger(asset.id)||asset.size<=0||!asset.name.toLowerCase().endsWith(platform==='android'?'.apk':'.exe'))throw Error('Instalador ausente ou inválido.');
  const digest=asset.digest?.match(/^sha256:([a-f0-9]{64})$/i)?.[1]?.toLowerCase();
  const supplied=typeof entry.sha256==='string'?entry.sha256.toLowerCase():null;
  if(supplied&&!/^[a-f0-9]{64}$/.test(supplied))throw Error('SHA-256 inválido.');
  if(digest&&supplied&&digest!==supplied)throw Error('SHA-256 divergente.');
  if(!digest&&!supplied)throw Error('SHA-256 ausente.');
  releases.push({id:String(asset.id),platform,version:entry.version,build:entry.build,minimumBuild:entry.minimumBuild,size:asset.size,sha256:digest||supplied,notes:String(entry.notes||release.body||'').slice(0,10000),createdAt:release.published_at,url:`${origin}/downloads/${asset.id}`});
 }
 if(!releases.length)throw Error('Manifesto sem plataformas.');
 cache={releases,checkedAt:new Date().toISOString(),expires:Date.now()+300000};return cache;
}
async function catalog(){
 if(!repo)return {status:'unconfigured',releases:[],checkedAt:null};
 if(cache&&cache.expires>Date.now())return {...cache,status:'ready'};
 if(Date.now()<retryAfter){if(cache&&Date.now()-Date.parse(cache.checkedAt)<86400000)return {...cache,status:'stale'};throw problem(503,'Não foi possível consultar as versões. Tente novamente em alguns minutos.');}
 if(!pending)pending=refresh().catch(()=>{retryAfter=Date.now()+60000;throw problem(503,'Não foi possível consultar uma versão oficial válida. Tente novamente em alguns minutos.');}).finally(()=>pending=null);
 try{return {...await pending,status:'ready'};}catch(e){if(cache&&Date.now()-Date.parse(cache.checkedAt)<86400000)return {...cache,status:'stale'};throw e;}
}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/logo.png':'logo.png','/widget':'widget.html'};
http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
 const route=new URL(req.url,'http://localhost');
 res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors ${route.pathname==='/widget'?'*':"'none'"}`);
 try{
  if(req.method!=='GET')throw problem(405,'Este site disponibiliza apenas consultas e downloads.');
  if(route.pathname==='/api/releases'){const c=await catalog();return json(res,200,{status:c.status,checkedAt:c.checkedAt,releases:c.releases});}
  if(route.pathname==='/api/v1/update'){
   const platform=route.searchParams.get('platform'),raw=route.searchParams.get('build')||'0',build=Number(raw);
   if(!['android','windows'].includes(platform)||!/^\d+$/.test(raw)||!Number.isSafeInteger(build))throw problem(400,'Informe platform=android|windows e build inteiro.');
   const c=await catalog(),r=c.releases.find(r=>r.platform===platform)||null;
   return json(res,200,{schemaVersion:1,status:c.status,checkedAt:c.checkedAt,platform,updateAvailable:!!r&&r.build>build,mandatory:c.status==='ready'&&!!r&&build<r.minimumBuild,minimumBuild:r?.minimumBuild??null,release:r});
  }
  const download=route.pathname.match(/^\/downloads\/(\d+)$/);
  if(download){
   const c=await catalog(),r=c.releases.find(r=>r.id===download[1]);if(!r)throw problem(404,'Versão indisponível.');
   const upstream=await github(`${base}/releases/assets/${r.id}`,true);
   res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="MarlicoBot-${r.platform}-${r.version}.${r.platform==='android'?'apk':'exe'}"`});
   await pipeline(Readable.fromWeb(upstream.body),res);return;
  }
  if(files[route.pathname]){const file=files[route.pathname],types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};const content=readFileSync(path.join(root,'public',file));res.writeHead(200,{'Content-Type':types[path.extname(file)]});res.end(content);return;}
  throw problem(404,'Página não encontrada.');
 }catch(e){if(!res.headersSent&&!res.destroyed)json(res,e.status||503,{error:e.status?e.message:'Versões temporariamente indisponíveis.'});else res.destroy();}
}).listen(port,host,()=>console.log(`MarlicoBot Downloads: ${origin} · GitHub ${repo||'a configurar'}`));
