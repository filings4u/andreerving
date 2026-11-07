/* Public website content and pricing from Andre Erving Supabase.
   A pricing record is authoritative by offering key. No obsolete numbered aliases. */
(()=>{
 "use strict";
 const origin="https://gnfyidajbectlppsekzj.supabase.co/rest/v1/";
 const key="sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf";
 const headers={apikey:key,Authorization:"Bearer "+key,Accept:"application/json"};
 const page=location.pathname.split("/").pop()||"index.html";
 const plans={
  "trucking-pro.html":["trucking-pro","trucking-pro-lifetime","trucking-pro-coaching"],
  "how-to-start-and-opeate-a-trucking-company.html":["trucking-pro","trucking-pro-lifetime","trucking-pro-coaching"],
  "freight-broker-training.html":["freight-broker-training","freight-broker-lifetime","broker-coaching-shippers-carriers"],
  "dispatcher-training.html":["dispatcher-training","dispatcher-plus-one","dispatcher-plus-two"],
  "time-management.html":["time-management"],
  "dot-specimen-collector-training.html":["dot-collector","dot-hair","dot-trainer"],
  "birthday.html":["birthday-250","birthday-325"],
  "portraits.html":["portraits-250","portraits-325"],
  "kids.html":["kids-175"],
  "broker-packages.html":["broker-package-1","broker-package-2","broker-package-3","broker-package-4"],
  "trucking-packages.html":["trucking-package-1","trucking-package-2","trucking-package-3"]
 };
 const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(n));
 async function read(table,params){
  const response=await fetch(origin+table+"?"+params,{headers,cache:"no-store"});
  if(!response.ok)throw Error("Website data unavailable ("+response.status+")");
  return await response.json();
 }
 const safeTag=new Set(["DIV","SECTION","P","H1","H2","H3","H4","UL","OL","LI","STRONG","EM","B","I","U","BR","BLOCKQUOTE","A","IMG","FIGURE","FIGCAPTION","SPAN"]);
 function sanitize(fragment){
  const doc=new DOMParser().parseFromString("<div>"+fragment+"</div>","text/html");
  for(const el of [...doc.body.querySelectorAll("*")].reverse()){
   if(!safeTag.has(el.tagName)){el.remove();continue}
   for(const attr of [...el.attributes]){
    if(el.tagName==="A"&&attr.name==="href"&&/^(https?:\/\/|\/|#)/i.test(attr.value))continue;
    if(el.tagName==="IMG"&&attr.name==="src"&&/^https:\/\//i.test(attr.value))continue;
    if(el.tagName==="IMG"&&attr.name==="alt")continue;
    if(attr.name==="class"&&/^[a-z0-9 _-]{1,120}$/i.test(attr.value))continue;
    if(attr.name==="data-cms-target"&&/^(hero|body)$/.test(attr.value))continue;
    el.removeAttribute(attr.name);
   }
  }
  return doc.body.firstElementChild;
 }
 async function updateCms(){
  const slug=page.replace(/\.html$/,"").toLowerCase();
  const items=await read("site_pages","select=slug,title,body_html&status=eq.published&slug=eq."+encodeURIComponent(slug)+"&limit=1");
  const record=items[0];if(!record?.body_html?.trim())return;
  const fragment=sanitize(record.body_html);
  if(!fragment)return;
  const main=document.querySelector("main");if(!main)return;
  // CMS hero edits update only the editable copy; preserve images, forms and navigation.
  const hero=main.querySelector(".page-hero,.hero");
  const h1=hero?.querySelector("h1");
  if(h1&&record.title)h1.textContent=record.title;
  const targeted=fragment.querySelector('[data-cms-target="hero"]');
  if(targeted&&hero){
   const revisedParagraph=targeted.querySelector("p");
   const originalParagraph=hero.querySelector("p");
   if(revisedParagraph&&originalParagraph)originalParagraph.innerHTML=revisedParagraph.innerHTML;
   targeted.remove();
  }
  const body=fragment.querySelector('[data-cms-target="body"]');
  const nodes=body?[...body.childNodes]:[...fragment.childNodes].filter(node=>node.nodeType!==1||!node.matches?.('[data-cms-target="hero"]'));
  if(nodes.length){
   const section=document.createElement("section");
   section.className="section ae-cms-managed-section";
   const container=document.createElement("div");container.className="container";
   container.append(...nodes.map(n=>n.cloneNode(true)));section.append(container);
   const hero=main.querySelector(".page-hero,.hero");
   if(hero)hero.after(section);else main.prepend(section);
  }
  if(record.title&&slug!=="index")document.title=record.title+" | Andre Erving";
 }
 function makeCheckout(link,entry){
  if(!link)return;
  const url=new URL("checkout.html",location.href);
  url.searchParams.set("item",entry.price_key.slice("offering.".length));
  url.searchParams.set("source",page);
  link.href=url.pathname.split("/").pop()+url.search;
 }
 async function updatePrices(){
  const items=await read("site_prices","select=price_key,label,amount,active&active=eq.true&price_key=like.offering.*&limit=200");
  const byId=new Map(items.map(x=>[x.price_key.slice(9),x]));
  const keys=plans[page]||[];
  const cards=[...document.querySelectorAll("main .price-card, main .package-card")];
  cards.forEach((card,i)=>{
   const entry=byId.get(keys[i]);
   if(!entry){if(keys[i])card.hidden=true;return}
   const price=card.querySelector(".price");
   if(price)price.textContent=money(entry.amount);
   const link=card.querySelector('a[href*="checkout.html"]');
   if(link)makeCheckout(link,entry);
   card.dataset.offeringId=keys[i];
  });
  // Catalog listing cards: the course page links directly to the matching named offering.
  document.querySelectorAll("main .course-card").forEach(card=>{
   const href=card.querySelector('a[href$=".html"]')?.getAttribute("href")||"";
   const code=({"trucking-pro.html":"trucking-pro","freight-broker-training.html":"freight-broker-training","dispatcher-training.html":"dispatcher-training","time-management.html":"time-management","dot-specimen-collector-training.html":"dot-collector"})[href];
   const item=byId.get(code);
   if(!item)return;
   const cost=card.querySelector(".price,.catalog-price,[data-price],.price-line strong");
   if(cost)cost.textContent=money(item.amount);
   makeCheckout(card.querySelector('a[href*="checkout.html"]'),item);
  });
  // eBooks and worksheets resolve by the actual named offering, not price position.
  const normalize=value=>String(value||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
  const named=new Map(items.map(x=>[normalize(x.label),x]));
  document.querySelectorAll("main .book-card").forEach(card=>{
   const title=card.querySelector("h3")?.textContent?.trim()||"";
   const entry=named.get(normalize(title));
   const price=card.querySelector(".book-footer strong");
   if(!entry){
    if(price)price.textContent="Not available";
    card.querySelectorAll('a[href*="checkout.html"]').forEach(link=>{link.removeAttribute("href");link.setAttribute("aria-disabled","true");link.style.pointerEvents="none"});
    return;
   }
   if(price)price.textContent=Number(entry.amount)===0?"Free":money(entry.amount);
   card.querySelectorAll('a[href*="checkout.html"]').forEach(link=>makeCheckout(link,entry));
   card.dataset.offeringId=entry.price_key.slice(9);
  });
  // Any link already using a named offering id inherits its latest price in its card.
  document.querySelectorAll('a[href*="checkout.html"]').forEach(link=>{
   if(link.closest(".price-card,.package-card,.course-card"))return;
   const url=new URL(link.href,location.href);
   const id=url.searchParams.get("item");
   if(!id)return;
   const entry=byId.get(id);
   if(!entry)return;
   makeCheckout(link,entry);
   const card=link.closest(".book-card,.catalog-card");
   const price=card?.querySelector(".price,.book-footer strong");
   if(price)price.textContent=Number(entry.amount)===0?"Free":money(entry.amount);
  });
 }
 Promise.allSettled([updatePrices(),updateCms()]).then(results=>{
  results.forEach((result,i)=>{if(result.status==="rejected")console.warn(i===0?"Website pricing could not refresh":"CMS content could not refresh",result.reason)});
 });
})();
