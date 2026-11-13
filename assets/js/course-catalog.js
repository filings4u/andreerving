/* Published LMS courses are the only source for the public course catalog. */
(()=>{
"use strict";
const endpoint="https://gnfyidajbectlppsekzj.supabase.co/functions/v1/andre-public-course-access";
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
const node=(tag,cls,content)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el};
const access=days=>Number(days)>0?Number(days)+"-day access":"Lifetime access";
const source=location.pathname.split("/").pop()||"index.html";
const safeImg=url=>{if(typeof url!=="string"||!url.trim())return "";try{const parsed=new URL(url,location.origin);return parsed.protocol==="https:"?parsed.href:""}catch{return ""}};
function card(c){
 const article=node("article","catalog-card course-card");article.dataset.courseSlug=c.slug;
 const media=node("div","catalog-media"),image=safeImg(c.featured_image_url);
 if(image){const img=document.createElement("img");img.alt=c.title;img.loading="lazy";img.src=image;img.onerror=()=>{img.remove();media.classList.add("catalog-media-missing")};media.append(img)}
 else media.classList.add("catalog-media-missing");
 media.append(node("span","media-tag",c.category||"Online Learning"));
 const body=node("div","catalog-body"),heading=node("div","price-line");
 heading.append(node("h3","",c.title),node("strong","",c.enrollable?money(c.price):"Enrollment unavailable"));
 const overview=String(c.description||"");const preview=overview.length>128?overview.slice(0,125).replace(/\s+\S*$/,"")+"…":overview;
 const description=node("p","",preview);
 const info=node("div","meta-line",access(c.access_days)+(c.certificate_enabled?" · Certificate":""));
 const links=node("div","course-purchase-actions");links.style.cssText="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px";
 const detail=node("a","arrow-link","View course →");detail.href="course.html?slug="+encodeURIComponent(c.slug);links.append(detail);
 if(c.enrollable){const buy=node("a","btn btn-primary","Enroll now");buy.href="checkout.html?"+new URLSearchParams({item:c.slug,price_key:"offering."+c.slug,source}).toString();links.append(buy)}
 body.append(heading,description,info,links);article.append(media,body);return article;
}
function render(courses){
 const grids=document.querySelectorAll("main .catalog-grid.course-grid,#dynamicCourseGrid");
 const data=courses.filter(c=>c&&typeof c.slug==="string"&&/^[a-z0-9-]+$/.test(c.slug)&&typeof c.title==="string");
 grids.forEach(grid=>grid.replaceChildren(...(data.length?data.map(card):[node("p","","No courses are currently published.")])));
}
const grids=document.querySelectorAll("main .catalog-grid.course-grid,#dynamicCourseGrid");
if(!grids.length)return;
fetch(endpoint,{headers:{Accept:"application/json"},cache:"no-store"})
 .then(r=>{if(!r.ok)throw Error("Course catalog HTTP "+r.status);return r.json()})
 .then(p=>{if(!Array.isArray(p.courses))throw Error("Invalid published course catalog");render(p.courses)})
 .catch(e=>{console.error("Published course catalog unavailable",e);grids.forEach(grid=>grid.replaceChildren(node("p","","Courses are temporarily unavailable. Please try again shortly.")))});
})();