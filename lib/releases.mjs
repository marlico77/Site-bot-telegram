// Separate from the repository containing this website's source code.
const repo=process.env.RELEASES_REPOSITORY?.trim()||'marlico77/bot-telegram';
if(repo&&!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error('RELEASES_REPOSITORY deve ser dono/repositorio.');
const token=process.env.GITHUB_TOKEN,base=`https://api.github.com/repos/${repo}`;
let cache=null,pending=null,retryAfter=0;
function problem(status,message){return Object.assign(Error(message),{status});}
async function github(url,binary=false){
 const headers={'User-Agent':'MarlicoBot-Updates','Accept':binary?'application/octet-stream':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization=`Bearer ${token}`;
 let response=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(8000)});
 if(binary&&[301,302,303,307,308].includes(response.status)){
  const location=new URL(response.headers.get('location'),url);
  if(location.protocol!=='https:'||!(location.hostname==='github.com'||location.hostname.endsWith('.githubusercontent.com')))throw Error('Destino inválido.');
  response=await fetch(location,{redirect:'error',signal:AbortSignal.timeout(8000)});
 }
 if(!response.ok)throw Object.assign(problem(503,'As versões estão temporariamente indisponíveis.'),{upstreamStatus:response.status});
 return response;
}
async function limitedJSON(response,max){let length=0,chunks=[];for await(const chunk of response.body){length+=chunk.length;if(length>max)throw Error('Metadados excedem o limite.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
async function refresh(){
 const repository=await limitedJSON(await github(base),65536);
 if(repository.private)throw problem(503,'O repositório dos instaladores precisa ser público para downloads diretos.');
 let release;
 try{release=await limitedJSON(await github(base+'/releases/latest'),2*1024*1024);}
 catch(e){
  if(e.upstreamStatus!==404)throw e;
  cache={releases:[],checkedAt:new Date().toISOString(),expires:Date.now()+300000};return cache;
 }
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
  const downloadUrl=new URL(asset.browser_download_url); if(downloadUrl.protocol!=='https:'||downloadUrl.hostname!=='github.com'||!downloadUrl.pathname.startsWith('/'+repo+'/releases/download/'))throw Error('URL inválida.');
  const digest=asset.digest?.match(/^sha256:([a-f0-9]{64})$/i)?.[1]?.toLowerCase();
  const supplied=typeof entry.sha256==='string'?entry.sha256.toLowerCase():null;
  if(supplied&&!/^[a-f0-9]{64}$/.test(supplied))throw Error('SHA-256 inválido.');
  if(digest&&supplied&&digest!==supplied)throw Error('SHA-256 divergente.');
  if(!digest&&!supplied)throw Error('SHA-256 ausente.');
  releases.push({id:String(asset.id),platform,version:entry.version,build:entry.build,minimumBuild:entry.minimumBuild,size:asset.size,sha256:digest||supplied,notes:String(entry.notes||release.body||'').slice(0,10000),createdAt:release.published_at,url:asset.browser_download_url});
 }
 if(!releases.length)throw Error('Manifesto sem plataformas.');
 cache={releases,checkedAt:new Date().toISOString(),expires:Date.now()+300000};return cache;
}
export async function catalog(){
 if(!repo)return {status:'unconfigured',releases:[],checkedAt:null};
 if(cache&&cache.expires>Date.now())return {...cache,status:'ready'};
 if(Date.now()<retryAfter){if(cache&&Date.now()-Date.parse(cache.checkedAt)<86400000)return {...cache,status:'stale'};throw problem(503,'Não foi possível consultar as versões. Tente novamente em alguns minutos.');}
 if(!pending)pending=refresh().catch(()=>{retryAfter=Date.now()+60000;throw problem(503,'Não foi possível consultar uma versão oficial válida. Tente novamente em alguns minutos.');}).finally(()=>pending=null);
 try{return {...await pending,status:'ready'};}catch(e){if(cache&&Date.now()-Date.parse(cache.checkedAt)<86400000)return {...cache,status:'stale'};throw e;}
}

