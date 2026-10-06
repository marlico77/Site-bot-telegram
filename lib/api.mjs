import {catalog} from './releases.mjs';

const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
export async function handle(request){
 try{
  if(request.method!=='GET')return json({error:'Método não permitido.'},405);
  const url=new URL(request.url);
  if(url.pathname==='/api/releases'){
   const c=await catalog();return json({status:c.status,checkedAt:c.checkedAt,releases:c.releases});
  }
  if(url.pathname==='/api/v1/update'){
   const platform=url.searchParams.get('platform'),raw=url.searchParams.get('build')||'0',build=Number(raw);
   if(!['android','windows'].includes(platform)||!/^\d+$/.test(raw)||!Number.isSafeInteger(build))return json({error:'Informe platform=android|windows e build inteiro.'},400);
   const c=await catalog(),r=c.releases.find(r=>r.platform===platform)||null;
   return json({schemaVersion:1,status:c.status,checkedAt:c.checkedAt,platform,updateAvailable:!!r&&r.build>build,mandatory:c.status==='ready'&&!!r&&build<r.minimumBuild,minimumBuild:r?.minimumBuild??null,release:r});
  }
  const match=url.pathname.match(/^\/downloads\/(\d+)$/);
  if(match){const c=await catalog(),r=c.releases.find(r=>r.id===match[1]);if(!r)return json({error:'Versão indisponível.'},404);return new Response(null,{status:302,headers:{Location:r.url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
  return json({error:'Página não encontrada.'},404);
 }catch(e){return json({error:e.status?e.message:'Versões temporariamente indisponíveis.'},e.status||503);}
}
