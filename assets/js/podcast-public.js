/* Public podcast reader: only published Supabase episodes. */
(async()=>{
 'use strict';
 const API='https://gnfyidajbectlppsekzj.supabase.co/rest/v1/podcast_episodes';
 const key='sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=d=>new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
 const duration=d=>{const s=Number(d)||0;return s?Math.floor(s/60)+':'+String(s%60).padStart(2,'0'):''};
 const poster='assets/images/about-office.webp';
 const q=new URLSearchParams(location.search);
 const link=e=>'podcast.html?episode='+encodeURIComponent(e.slug);
 let episodes=[],page=1,category='all',search='';
 try{
  const url=API+'?select=id,slug,title,excerpt,show_notes,transcript,guests,category,tags,season_number,episode_number,duration_seconds,audio_url,cover_image_url,social_image_url,seo_title,seo_description,canonical_url,published_at,episode_type&status=eq.published&published_at=lte.'+encodeURIComponent(new Date().toISOString())+'&order=published_at.desc&limit=300';
  const response=await fetch(url,{headers:{apikey:key,Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error('Episodes are temporarily unavailable.');
  episodes=await response.json();
  const selected=episodes.find(e=>e.slug===q.get('episode'));
  if(selected){showEpisode(selected);return}
  showListing();
 }catch(err){$('podcast-episodes').innerHTML='<p class="podcast-state" role="status">'+esc(err.message)+'</p>'}
 function showListing(){
  if(!episodes.length){$('podcast-featured-wrap').hidden=true;$('podcast-episodes').innerHTML='<div class="podcast-empty"><h3>New episodes are on the way</h3><p>Subscribe to The Andre Erving Show for conversations on business, leadership, trucking, transportation and personal growth.</p><a href="https://media.rss.com/rise-thrive/feed.xml" target="_blank" rel="noopener">Listen to the previous Rise & Thrive archive</a></div>';return}
  const categories=['All episodes',...new Set(episodes.map(e=>e.category||'General'))];
  $('podcast-filters').innerHTML='<div class="podcast-filter-bar"><label>Explore by topic <select id="podcast-category">'+categories.map((c,i)=>'<option value="'+esc(i?c:'all')+'">'+esc(c)+'</option>').join('')+'</select></label><label>Search episodes <input id="podcast-search" type="search" placeholder="Search titles, topics or guests"></label></div>';
  $('podcast-category').onchange=e=>{category=e.target.value;page=1;render()};
  $('podcast-search').oninput=e=>{search=e.target.value.toLowerCase();page=1;render()};
  const featured=episodes[0];
  $('podcast-featured').innerHTML='<div class="podcast-featured-art"><img src="'+esc(featured.cover_image_url||poster)+'" alt="Latest episode cover"></div><div><span class="podcast-label">Latest episode · '+date(featured.published_at)+'</span><h2>'+esc(featured.title)+'</h2><p>'+esc(featured.excerpt||'')+'</p><a class="btn btn-primary" href="'+link(featured)+'">Listen to episode →</a></div>';
  render();
 }
 function render(){
  const found=episodes.filter(e=>(category==='all'||e.category===category)&&[e.title,e.excerpt,e.guests,(e.tags||[]).join(' ')].join(' ').toLowerCase().includes(search));
  const total=Math.max(1,Math.ceil(found.length/9));page=Math.min(total,Math.max(1,page));
  $('podcast-episodes').innerHTML=found.slice((page-1)*9,page*9).map(e=>'<article class="podcast-card"><a class="podcast-art" href="'+link(e)+'"><img src="'+esc(e.cover_image_url||poster)+'" alt="'+esc(e.title)+' cover art" loading="lazy"></a><div class="podcast-card-body"><span class="podcast-eyebrow">Season '+(e.season_number||1)+(e.episode_number?' · Episode '+e.episode_number:'')+' · '+esc(e.category||'Podcast')+'</span><h3><a href="'+link(e)+'">'+esc(e.title)+'</a></h3><p>'+esc(e.excerpt||'')+'</p><span class="podcast-card-meta">'+date(e.published_at)+(e.duration_seconds?' · '+duration(e.duration_seconds):'')+'</span><a class="podcast-listen" href="'+link(e)+'">Listen now ↗</a></div></article>').join('')||'<p class="podcast-state">No episodes match your search.</p>';
  $('podcast-pagination').innerHTML='<button type="button" id="podcast-previous" '+(page===1?'disabled':'')+'>Previous</button><span>Page '+page+' of '+total+'</span><button type="button" id="podcast-next" '+(page===total?'disabled':'')+'>Next</button>';
  $('podcast-previous').onclick=()=>{page--;render();$('podcast-library').scrollIntoView({behavior:'smooth'})};
  $('podcast-next').onclick=()=>{page++;render();$('podcast-library').scrollIntoView({behavior:'smooth'})};
 }
 function showEpisode(e){
  document.title=(e.seo_title||e.title)+' | The Andre Erving Show';
  const setMeta=(type,name,value)=>{if(!value)return;let m=document.querySelector('meta['+type+'="'+name+'"]');if(!m){m=document.createElement('meta');m.setAttribute(type,name);document.head.append(m)}m.content=value};
  setMeta('name','description',e.seo_description||e.excerpt);
  setMeta('property','og:title',e.seo_title||e.title);
  setMeta('property','og:description',e.seo_description||e.excerpt);
  setMeta('property','og:image',e.social_image_url||e.cover_image_url||'');
  let canon=document.querySelector('link[rel="canonical"]');if(!canon){canon=document.createElement('link');canon.rel='canonical';document.head.append(canon)}canon.href=e.canonical_url||location.href;
  $('podcast-intro').hidden=true;$('podcast-featured-wrap').hidden=true;$('podcast-library').hidden=true;
  const hero=$('podcast-episode-detail');hero.hidden=false;
  const safeNotes=html=>{const d=new DOMParser().parseFromString('<div>'+String(html||'')+'</div>','text/html'),allowed=new Set(['P','DIV','BR','H2','H3','H4','B','STRONG','EM','I','UL','OL','LI','BLOCKQUOTE','A']);[...d.body.querySelectorAll('*')].reverse().forEach(el=>{if(!allowed.has(el.tagName)){el.replaceWith(...el.childNodes);return}for(const attr of [...el.attributes]){if(el.tagName==='A'&&attr.name==='href'&&/^https?:\/\//.test(attr.value)){el.setAttribute('rel','noopener noreferrer');continue}el.removeAttribute(attr.name)}});return d.body.firstElementChild.innerHTML};
  hero.innerHTML='<div class="container podcast-episode-layout"><a href="podcast.html" class="podcast-back">← All episodes</a><div class="podcast-episode-head"><div><span class="podcast-label">The Andre Erving Show · '+date(e.published_at)+'</span><h1>'+esc(e.title)+'</h1><p>'+esc(e.excerpt||'')+'</p><span class="podcast-episode-meta">'+esc(e.category||'')+(e.season_number?' · Season '+e.season_number:'')+(e.episode_number?' · Episode '+e.episode_number:'')+'</span></div><img src="'+esc(e.cover_image_url||poster)+'" alt="Episode artwork"></div><div class="podcast-episode-content"><div class="podcast-player"><h2>Listen to this episode</h2>'+(e.audio_url?'<audio controls preload="metadata" src="'+esc(e.audio_url)+'">Your browser does not support audio playback.</audio>':'<p>Audio is unavailable for this episode.</p>')+'<div class="podcast-player-actions"><button type="button" id="podcast-share">Share episode</button>'+(e.audio_url?'<a href="'+esc(e.audio_url)+'" download>Download audio</a>':'')+'</div></div>'+(e.show_notes?'<section class="podcast-notes"><h2>Episode show notes</h2>'+safeNotes(e.show_notes)+'</section>':'')+(e.transcript?'<details class="podcast-transcript"><summary>Read episode transcript</summary><pre></pre></details>':'')+'</div></div>';
  if(e.transcript)hero.querySelector('.podcast-transcript pre').textContent=e.transcript;
  hero.querySelector('#podcast-share').onclick=async()=>{if(navigator.share){try{await navigator.share({title:e.title,url:location.href});return}catch{}}try{await navigator.clipboard.writeText(location.href);hero.querySelector('#podcast-share').textContent='Link copied'}catch{hero.querySelector('#podcast-share').textContent='Copy this page URL'}};
 }
})();