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
const TAGS=new Set(["P","BR","H2","H3","H4","STRONG","B","EM","I","U","S","UL","OL","LI","BLOCKQUOTE","A","IMG","HR","DIV","SPAN","FIGURE","FIGCAPTION","PRE","CODE","TABLE","TBODY","THEAD","TR","TD","TH","IFRAME","SUP","SUB","FONT"]);
function urlOK(raw,image=false){if(!String(raw||"").trim())return null;try{const u=new URL(raw,location.origin);return u.protocol==="https:"||u.protocol==="http:"||!image&&u.protocol==="mailto:"?u.href:null}catch{return null}}
const safeArticleStyle=value=>{
 const allowed={
 color:v=>/^#[0-9a-f]{3,8}$/i.test(v)||/^rgba?\([0-9., %]+\)$/i.test(v),
 "background-color":v=>/^#[0-9a-f]{3,8}$/i.test(v)||/^rgba?\([0-9., %]+\)$/i.test(v),
 "font-family":v=>/^(Arial|Georgia|Verdana|Tahoma|Times New Roman|Courier New|Helvetica|serif|sans-serif|monospace)(, ?(serif|sans-serif|monospace))?$/i.test(v),
 "font-size":v=>/^(1[0-9]|2[0-9]|3[0-6])px$/.test(v),
 "line-height":v=>/^(1|1\.[0-9]|2|2\.[0-5])$/.test(v),
 "margin-bottom":v=>/^(0|[0-9]|[1-6][0-9])px$/.test(v),
 "text-align":v=>/^(left|center|right|justify)$/.test(v),
 "text-decoration":v=>/^(underline|line-through|none)$/.test(v)
 };
 return String(value||"").split(";").map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf(":");if(i<0)return "";const k=x.slice(0,i).trim().toLowerCase(),v=x.slice(i+1).trim();return allowed[k]?.(v)?k+":"+v:""}).filter(Boolean).join(";");
};
function safeEmbed(value){try{const u=new URL(value);if(u.protocol!=="https:")return null;if(["www.youtube-nocookie.com","www.youtube.com"].includes(u.hostname)&&/^\/embed\/[a-zA-Z0-9_-]{11}$/.test(u.pathname))return "https://www.youtube-nocookie.com"+u.pathname;if(u.hostname==="player.vimeo.com"&&/^\/video\/\d+$/.test(u.pathname))return u.origin+u.pathname;return null}catch{return null}}
export function removeDuplicateArticleCover(html,cover){
 if(!cover)return html;
 const doc=new DOMParser().parseFromString("<div>"+String(html||"")+"</div>","text/html"),wrap=doc.body.firstElementChild;
 const key=value=>{try{const u=new URL(value,location.origin);return u.hostname.toLowerCase()+(u.hostname.endsWith("wixstatic.com")?decodeURIComponent(u.pathname).split("/v1/")[0]:decodeURIComponent(u.pathname)).toLowerCase()}catch{return ""}};
 const fingerprint=key(cover);if(!fingerprint)return html;
 for(const img of [...wrap.querySelectorAll("img")]){
  if(key(img.getAttribute("src"))!==fingerprint)continue;
  const figure=img.closest("figure");if(figure&&figure.querySelectorAll("img").length===1)figure.remove();else img.remove();
 }return wrap.innerHTML;
}
export function sanitizeArticleHTML(html){
 const documentFragment=new DOMParser().parseFromString("<div>"+String(html||"")+"</div>","text/html");
 const wrap=documentFragment.body.firstElementChild;
 function walk(node){
  for(const child of [...node.childNodes]){
   if(child.nodeType===8){child.remove();continue}if(child.nodeType===3)continue;
   if(child.nodeType!==1){child.remove();continue}
   if(!TAGS.has(child.tagName)){child.replaceWith(...[...child.childNodes]);walk(node);continue}
   const href=child.getAttribute("href"),src=child.getAttribute("src"),alt=child.getAttribute("alt"),style=child.getAttribute("style"),fontColor=child.getAttribute("color"),fontFace=child.getAttribute("face"),fontSize=child.getAttribute("size");
   for(const attribute of [...child.attributes])child.removeAttribute(attribute.name);
   if(child.tagName==="FONT"){const span=documentFragment.createElement("span");const settings=[fontColor?"color:"+fontColor:"",fontFace?"font-family:"+fontFace:"",fontSize?("font-size:"+({1:12,2:14,3:16,4:18,5:24,6:30,7:36}[Number(fontSize)]||16)+"px"):""].filter(Boolean).join(";");const css=safeArticleStyle(settings);if(css)span.setAttribute("style",css);span.append(...child.childNodes);child.replaceWith(span);walk(span);continue}
   if(child.tagName==="IFRAME"){const embed=safeEmbed(src||"");if(!embed){child.remove();continue}child.setAttribute("src",embed);child.setAttribute("title","Embedded article video");child.setAttribute("loading","lazy");child.setAttribute("referrerpolicy","strict-origin-when-cross-origin");child.setAttribute("allowfullscreen","");continue}
   const css=safeArticleStyle(style);if(css)child.setAttribute("style",css);
   if(child.tagName==="IMG"){const safe=urlOK(src||"",true);if(!safe){child.remove();continue}child.setAttribute("src",safe);child.setAttribute("loading","lazy");child.setAttribute("alt",String(alt||"Article image").slice(0,180))}
   if(child.tagName==="A"){const safe=urlOK(href||"");if(safe){child.setAttribute("href",safe);child.setAttribute("rel","noopener noreferrer")}}
   walk(child);
  }
 }walk(wrap);return wrap.innerHTML;
}
export function safeImage(url){const result=urlOK(url||"",true);return result||""}
