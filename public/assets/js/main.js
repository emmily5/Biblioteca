
// ══════════════════════════════════════════
// STATE & PERSISTENCE  (API REST — db.json no servidor)
// ══════════════════════════════════════════
let db = { categories:[], components:[] };
let activeCatId = null;
let activeCompId = null;
let editingCompId = null;
let pendingImgData = null;
let pendingPreviewUrl = null;
const MAX_SOURCE_IMAGE_SIZE = 25 * 1024 * 1024;
const WEBP_QUALITY = 0.86;

// helper genérico de chamada à API
async function api(path, opts){
  const res = await fetch('/api'+path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if(!res.ok){
    let msg = 'Erro na requisição';
    try{ const j = await res.json(); if(j && j.error) msg = j.error; }catch(e){}
    throw new Error(msg);
  }
  // DELETE / respostas sem corpo
  if(res.status === 204) return null;
  return res.json();
}

async function uploadImage(file){
  const form = new FormData();
  form.append('file', file, file.name || 'screenshot.webp');
  const res = await fetch('/api/images', { method:'POST', body:form });
  if(!res.ok){
    let msg = 'Erro ao enviar imagem';
    try{ const j = await res.json(); if(j && j.error) msg = j.error; }catch(e){}
    throw new Error(msg);
  }
  return res.json();
}

// carrega categories + components da API para a variável global db
async function loadDb(){
  try{
    const [categories, components] = await Promise.all([
      api('/categories'),
      api('/components'),
    ]);
    db.categories = categories || [];
    db.components = components || [];
  }catch(e){
    toast('Não foi possível carregar os dados do servidor.');
  }
}

// recarrega do servidor e re-renderiza tudo
async function refresh(){
  await loadDb();
  renderSidebar();
  renderCards();
}

function uid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36); }
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

// ══════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════
function renderSidebar(){
  const list=document.getElementById('catList');
  if(!db.categories.length){
    list.innerHTML=`<div style="padding:12px 10px;font-size:12px;color:var(--text3);line-height:1.6;">Nenhuma categoria ainda.<br>Crie a primeira abaixo.</div>`;
    return;
  }
  list.innerHTML=db.categories.map(cat=>{
    const count=db.components.filter(c=>c.catId===cat.id).length;
    return `<div class="cat-item ${activeCatId===cat.id?'active':''}" onclick="selectCat('${cat.id}')">
      <span class="cat-emoji">${cat.emoji||'📁'}</span>
      <span class="cat-name">${esc(cat.name)}</span>
      <span class="cat-actions">
        <button class="cat-action" title="Editar categoria" onclick="event.stopPropagation();openCatModal('${cat.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="cat-action danger" title="Excluir categoria" onclick="event.stopPropagation();confirmDeleteCat('${cat.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </span>
      <span class="cat-count">${count}</span>
    </div>`;
  }).join('');
}

function selectCat(id){
  activeCatId=id;
  document.getElementById('addCompBtn').style.display='flex';
  renderSidebar();
  renderCards();
}

// ══════════════════════════════════════════
// CARDS
// ══════════════════════════════════════════
function renderCards(){
  const q=document.getElementById('searchInput').value.toLowerCase();
  const cat=db.categories.find(c=>c.id===activeCatId);
  const main=document.getElementById('mainContent');

  if(!activeCatId){
    main.innerHTML=`<div class="empty-state">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      <h3>Selecione uma categoria</h3>
      <p>Crie categorias na barra lateral e adicione suas seções.</p>
    </div>`;
    document.getElementById('pageTitle').textContent='Biblioteca de Seções';
    document.getElementById('pageCount').textContent='';
    return;
  }

  const comps=db.components.filter(c=>{
    if(c.catId!==activeCatId)return false;
    if(!q)return true;
    return (c.name||'').toLowerCase().includes(q)||(c.desc||'').toLowerCase().includes(q);
  });

  document.getElementById('pageTitle').textContent=(cat.emoji?cat.emoji+' ':'')+cat.name;
  document.getElementById('pageCount').textContent = comps.length + (comps.length === 1 ? ' seção' : ' seções');

  if(!comps.length){
    main.innerHTML=`<div class="empty-state">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
      <h3>Nenhuma seção ainda</h3>
      <p>Clique em "Adicionar seção" e cadastre sua primeira seção de <strong>${esc(cat.name)}</strong>.</p>
      <button class="btn-primary" onclick="openCompModal()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Adicionar seção
      </button>
    </div>`;
    return;
  }

  const badgeStyle=cat.bg?`background:${cat.bg};color:${cat.color};`:'background:#f0ede8;color:#6b6757;';

  main.innerHTML=`<div class="grid">${comps.map(comp=>{
    let thumb='';
    if(comp.img){
      thumb=`<img class="thumb-img" src="${comp.img}" alt="${esc(comp.name)}">`;
    } else {
      thumb=`<div class="no-preview">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Sem imagem
      </div>`;
    }
    return `<div class="card" onclick="openDetail('${comp.id}')">
      <div class="card-thumb">${thumb}</div>
      <div class="card-body">
        <div class="card-name">${esc(comp.name)}</div>
        ${comp.desc?`<div class="card-desc">${esc(comp.desc)}</div>`:''}
        <div class="card-footer-row">
          <span class="cat-badge" style="${badgeStyle}">${cat.emoji?cat.emoji+' ':''}${esc(cat.name)}</span>
          <span class="card-hint">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            ver código
          </span>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// ══════════════════════════════════════════
// DETAIL MODAL
// ══════════════════════════════════════════
function openDetail(id){
  const comp=db.components.find(c=>c.id===id);
  if(!comp)return;
  activeCompId=id;

  const cat=db.categories.find(c=>c.id===comp.catId)||{};
  document.getElementById('detailTitle').textContent=comp.name;
  document.getElementById('detailSub').textContent=(cat.emoji?cat.emoji+' ':'')+cat.name;

  // image
  const wrap=document.getElementById('detailImgWrap');
  if(comp.img){
    wrap.innerHTML=`<img src="${comp.img}" alt="${esc(comp.name)}" style="width:100%;height:100%;object-fit:contain;display:block;background:#fff">`;
  } else {
    wrap.innerHTML=`<div class="modal-img-placeholder">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Nenhuma imagem cadastrada
    </div>`;
  }

  // code panels
  setCodePanel('html', comp.html||'');
  setCodePanel('css', comp.css||'');
  setCodePanel('js', comp.js||'');

  // reset to HTML tab
  switchTab('html');
  document.getElementById('detailOverlay').classList.add('open');
}

function setCodePanel(type, code){
  const el=document.getElementById('code'+type.charAt(0).toUpperCase()+type.slice(1));
  if(code.trim()){
    el.textContent=code;
    el.className='code-block';
  } else {
    el.textContent='';
    el.className='code-block';
    el.innerHTML=`<span style="color:var(--text3);font-family:var(--sans);font-size:13px;">Nenhum código de ${type.toUpperCase()} cadastrado.</span>`;
  }
}

function switchTab(type){
  document.querySelectorAll('.tab-btn').forEach((b,i)=>{
    const types=['html','css','js'];
    b.classList.toggle('active', types[i]===type);
  });
  ['html','css','js'].forEach(t=>{
    document.getElementById('panel-'+t).classList.toggle('active', t===type);
  });
}

function copyTab(type){
  const comp=db.components.find(c=>c.id===activeCompId);
  if(!comp)return;
  const code=comp[type]||'';
  if(!code.trim()){toast('Nenhum código de '+type.toUpperCase()+' para copiar.');return;}
  navigator.clipboard.writeText(code).then(()=>{
    const btn=document.getElementById('copy'+type.charAt(0).toUpperCase()+type.slice(1)+'Btn');
    if(btn){
      const orig=btn.innerHTML;
      btn.classList.add('ok');
      btn.innerHTML=`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copiado!`;
      setTimeout(()=>{btn.classList.remove('ok');btn.innerHTML=orig;},2000);
    }
    toast(type.toUpperCase()+' copiado!');
  });
}

function closeDetail(){
  document.getElementById('detailOverlay').classList.remove('open');
  activeCompId=null;
}

// ══════════════════════════════════════════
// ADD / EDIT COMPONENT
// ══════════════════════════════════════════
let currentFormTab='html';

function openCompModal(id){
  editingCompId=id||null;
  pendingImgData=null;
  clearPendingPreviewUrl();
  const comp=id?db.components.find(c=>c.id===id):null;

  document.getElementById('compModalTitle').textContent=comp?'Editar seção':'Nova seção';
  document.getElementById('cName').value=comp?comp.name:'';
  document.getElementById('cDesc').value=comp?comp.desc||'':'';
  document.getElementById('cHtml').value=comp?comp.html||'':'';
  document.getElementById('cCss').value=comp?comp.css||'':'';
  document.getElementById('cJs').value=comp?comp.js||'':'';

  const prev=document.getElementById('imgPreview');
  if(comp&&comp.img){ prev.src=comp.img; prev.style.display='block'; }
  else { prev.style.display='none'; prev.src=''; }

  switchFormTab('html', document.querySelector('.code-tab-btn'));
  document.getElementById('compOverlay').classList.add('open');
  setTimeout(()=>document.getElementById('cName').focus(),80);
}

function closeCompModal(){
  document.getElementById('compOverlay').classList.remove('open');
  document.getElementById('imgInput').value='';
}

function switchFormTab(type, btn){
  currentFormTab=type;
  document.querySelectorAll('.code-tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  ['html','css','js'].forEach(t=>{
    document.getElementById('ftab-'+t).classList.toggle('active',t===type);
  });
}

async function handleImg(input){
  const file=input.files[0];
  if(!file)return;

  try{
    const webpFile=await prepareWebpImage(file);
    pendingImgData={ file:webpFile };
    const prev=document.getElementById('imgPreview');
    clearPendingPreviewUrl();
    pendingPreviewUrl=URL.createObjectURL(webpFile);
    prev.src=pendingPreviewUrl;
    prev.style.display='block';
    toast(file.type==='image/webp'?'Imagem WebP pronta.':'Imagem convertida para WebP.');
  }catch(e){
    input.value='';
    toast(e.message||'Imagem invalida.');
  }
}

async function prepareWebpImage(file){
  if(!file.type.startsWith('image/')){
    throw new Error('Escolha um arquivo de imagem.');
  }
  if(file.size > MAX_SOURCE_IMAGE_SIZE){
    throw new Error('Imagem maior que 25 MB.');
  }
  if(file.type === 'image/webp'){
    return file;
  }
  if(!['image/png','image/jpeg','image/jpg'].includes(file.type)){
    throw new Error('Use PNG, JPG, JPEG ou WEBP.');
  }

  const bitmap=await createImageBitmap(file);
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;
  canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(bitmap,0,0);
  if(bitmap.close) bitmap.close();

  const blob=await new Promise((resolve,reject)=>{
    canvas.toBlob(result=>result?resolve(result):reject(new Error('Nao foi possivel converter a imagem.')), 'image/webp', WEBP_QUALITY);
  });
  const name=(file.name||'screenshot').replace(/\.[^.]+$/,'')+'.webp';
  return new File([blob], name, { type:'image/webp' });
}

function clearPendingPreviewUrl(){
  if(pendingPreviewUrl){
    URL.revokeObjectURL(pendingPreviewUrl);
    pendingPreviewUrl=null;
  }
}

async function saveComp(){
  const name=document.getElementById('cName').value.trim();
  const desc=document.getElementById('cDesc').value.trim();
  const html=document.getElementById('cHtml').value.trim();
  const css=document.getElementById('cCss').value.trim();
  const js=document.getElementById('cJs').value.trim();

  if(!name){alert('Dê um nome para a seção.');return;}
  if(!activeCatId){alert('Selecione uma categoria primeiro.');return;}

  try{
    let uploadedImgUrl=null;
    if(pendingImgData && pendingImgData.file){
      toast('Enviando imagem...');
      const uploaded=await uploadImage(pendingImgData.file);
      uploadedImgUrl=uploaded.url;
    }

    if(editingCompId){
      const payload={name,desc,html,css,js};
      if(uploadedImgUrl!==null) payload.img=uploadedImgUrl;
      await api('/components/'+editingCompId, { method:'PUT', body:JSON.stringify(payload) });
      toast('Seção atualizada!');
    } else {
      await api('/components', { method:'POST', body:JSON.stringify({
        catId:activeCatId, name, desc, html, css, js, img:uploadedImgUrl
      }) });
      toast('Seção adicionada!');
    }
    closeCompModal();
    await refresh();
  }catch(e){
    toast(e.message||'Erro ao salvar a seção.');
  }
}

function editFromDetail(){
  const id=activeCompId;
  closeDetail();
  openCompModal(id);
}

// ══════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════
function confirmDeleteFromDetail(){
  const comp=db.components.find(c=>c.id===activeCompId);
  if(!comp)return;
  const delId=activeCompId;
  document.getElementById('confirmText').textContent=`Excluir "${comp.name}"? Isso não pode ser desfeito.`;
  document.getElementById('confirmBtn').onclick=async()=>{
    try{
      await api('/components/'+delId, { method:'DELETE' });
      closeConfirm(); closeDetail();
      await refresh();
      toast('Seção excluída.');
    }catch(e){
      toast(e.message||'Erro ao excluir a seção.');
    }
  };
  document.getElementById('confirmOverlay').classList.add('open');
}

function closeConfirm(){ document.getElementById('confirmOverlay').classList.remove('open'); }

// ══════════════════════════════════════════
// CATEGORY
// ══════════════════════════════════════════
let editingCatId=null;

function openCatModal(id){
  editingCatId=id||null;
  const cat=id?db.categories.find(c=>c.id===id):null;
  document.getElementById('catModalTitle').textContent=cat?'Editar categoria':'Nova categoria';
  document.getElementById('catName').value=cat?cat.name:'';
  document.getElementById('catEmoji').value=cat?(cat.emoji||''):'';
  document.getElementById('catBg').value=cat?(cat.bg||'#ede8ff'):'#e8f5e9';
  document.getElementById('catColor').value=cat?(cat.color||'#4423A7'):'#1b5e20';
  document.getElementById('catOverlay').classList.add('open');
  setTimeout(()=>document.getElementById('catName').focus(),80);
}
function closeCatModal(){ document.getElementById('catOverlay').classList.remove('open'); }

async function saveCat(){
  const name=document.getElementById('catName').value.trim();
  if(!name){alert('Dê um nome para a categoria.');return;}
  const payload={
    name,
    emoji:document.getElementById('catEmoji').value.trim(),
    bg:document.getElementById('catBg').value,
    color:document.getElementById('catColor').value
  };
  try{
    if(editingCatId){
      await api('/categories/'+editingCatId, { method:'PUT', body:JSON.stringify(payload) });
      toast('Categoria atualizada!');
    } else {
      await api('/categories', { method:'POST', body:JSON.stringify(payload) });
      toast('Categoria criada!');
    }
    closeCatModal();
    await refresh();
  }catch(e){
    toast(e.message||'Erro ao salvar a categoria.');
  }
}

function confirmDeleteCat(id){
  const cat=db.categories.find(c=>c.id===id);
  if(!cat)return;
  const count=db.components.filter(c=>c.catId===id).length;
  const extra=count?` Isso também excluirá ${count} ${count===1?'seção':'seções'} dentro dela.`:'';
  document.getElementById('confirmText').textContent=`Excluir a categoria "${cat.name}"?${extra} Isso não pode ser desfeito.`;
  document.getElementById('confirmBtn').onclick=async()=>{
    try{
      await api('/categories/'+id, { method:'DELETE' });
      closeConfirm();
      if(activeCatId===id){
        activeCatId=null;
        document.getElementById('addCompBtn').style.display='none';
        document.getElementById('searchInput').value='';
      }
      await refresh();
      toast('Categoria excluída.');
    }catch(e){
      toast(e.message||'Erro ao excluir a categoria.');
    }
  };
  document.getElementById('confirmOverlay').classList.add('open');
}

// Close on overlay click
document.querySelectorAll('.overlay').forEach(el=>{
  el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open');});
});

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
(async function init(){
  await loadDb();
  renderSidebar();
  renderCards();
})();


function goHome(){
  activeCatId = null;
  document.getElementById('addCompBtn').style.display = 'none';
  document.getElementById('searchInput').value = '';
  renderSidebar();
  renderCards();
}
