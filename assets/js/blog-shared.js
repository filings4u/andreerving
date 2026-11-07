// Public, read-only blog record helpers. Drafts are never rendered.
export const BLOG_API="https://gnfyidajbectlppsekzj.supabase.co/rest/v1/blog_posts";
const KEY="sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf";
export const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const slugify=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export const dateLabel=d=>d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"";
export async function fetchPublished(filter=""){
 const url=BLOG_API+"?select=*&status=eq.published&published_at=lte."+encodeURIComponent(new Date().toISOString())+(filter?"&"+filter:"")+"&order=published_at.desc&limit=100";
 const resp=await fetch(url,{headers:{apikey:KEY,Accept:"application/json"},cache:"no-store"});
 if(!resp.ok)throw Error("Articles are temporarily unavailable.");
 return resp.json();
}
const TAGS=new Set(["P","BR","H2","H3","H4","STRONG","B","EM","I","U","S","UL","OL","LI","BLOCKQUOTE","A","IMG","HR","DIV","SPAN","FIGURE","FIGCAPTION","PRE","CODE","TABLE","TBODY","THEAD","TR","TD","TH"]);
function urlOK(raw,image=false){if(!String(raw||"").trim())return null;try{const u=new URL(raw,location.origin);return u.protocol==="https:"||u.protocol==="http:"||!image&&u.protocol==="mailto:"?u.href:null}catch{return null}}
export function sanitizeArticleHTML(html){
 const documentFragment=new DOMParser().parseFromString("<div>"+String(html||"")+"</div>","text/html");
 const wrap=documentFragment.body.firstElementChild;
 function walk(node){
  for(const child of [...node.childNodes]){
   if(child.nodeType===8){child.remove();continue}if(child.nodeType===3)continue;
   if(child.nodeType!==1){child.remove();continue}
   if(!TAGS.has(child.tagName)){child.replaceWith(...[...child.childNodes]);walk(node);continue}
   const href=child.getAttribute("href"),src=child.getAttribute("src"),alt=child.getAttribute("alt");
   for(const attribute of [...child.attributes])child.removeAttribute(attribute.name);
   if(child.tagName==="IMG"){const safe=urlOK(src||"",true);if(!safe){child.remove();continue}child.setAttribute("src",safe);child.setAttribute("loading","lazy");child.setAttribute("alt",String(alt||"Article image").slice(0,180))}
   if(child.tagName==="A"){const safe=urlOK(href||"");if(safe){child.setAttribute("href",safe);child.setAttribute("rel","noopener noreferrer")}}
   walk(child);
  }
 }walk(wrap);return wrap.innerHTML;
}
export function safeImage(url){const result=urlOK(url||"",true);return result||""}
