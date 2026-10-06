const $=id=>document.getElementById(id);
const names={android:'Android · TV Box e celular',windows:'Windows · agente do PC'};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){
 try{
  const res=await fetch('/api/releases');const data=await res.json();if(!res.ok)throw Error(data.error||'Não foi possível consultar as versões.');
  $('notice').classList.remove('error');$('notice').textContent=data.status==='stale'?'A consulta está temporariamente indisponível. Exibindo as últimas versões conhecidas.':data.status==='unconfigured'?'Os downloads oficiais estarão disponíveis em breve.':'';
  $('latest').innerHTML=['android','windows'].map(platform=>{const r=data.releases.find(r=>r.platform===platform);return `<article class="card"><div class="card-top"><span class="platform-icon" aria-hidden="true"><i class="fa-icon icon-${platform}"></i></span><span class="badge ${r?'':'draft'}">${r?'Versão estável':'Em breve'}</span></div><h3>${names[platform]}</h3><div class="release-version">${r?'v'+esc(r.version):'Em preparação'}</div><small>${r?`${(r.size/1048576).toFixed(1)} MB · ${esc(new Date(r.createdAt).toLocaleDateString('pt-BR'))}`:'Aguarde a publicação da versão oficial.'}</small>${r?`<br><a class="download primary" href="/downloads/${encodeURIComponent(r.id)}"><i class="fa-icon icon-download" aria-hidden="true"></i><span>Baixar ${platform==='android'?'APK':'para Windows'}</span></a><details><summary>Integridade do arquivo</summary><p class="hash">SHA-256: ${esc(r.sha256)}</p></details>`:''}</article>`;}).join('');
  if($('release-notes'))$('release-notes').innerHTML=data.releases.length?data.releases.map(r=>`<article class="release"><h3>${esc(names[r.platform])} · ${esc(r.version)}</h3><p class="notes">${esc(r.notes||'Nova versão oficial disponível.')}</p></article>`).join(''):'<p>Nenhuma versão publicada ainda.</p>';
  if($('sync-status'))$('sync-status').textContent=data.checkedAt?'Última consulta: '+new Date(data.checkedAt).toLocaleString('pt-BR'):'Versões estáveis para seus dispositivos.';
 }catch(e){$('notice').textContent=e.message;$('notice').classList.add('error');if(!$('latest').querySelector('.card'))$('latest').textContent='Downloads temporariamente indisponíveis.';}
}
refresh();setInterval(refresh,60000);
