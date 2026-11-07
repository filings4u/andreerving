import {fetchPublished,escapeHTML,dateLabel,safeImage} from "./blog-shared.js?v=blog-shared-20261107b";
async function init(){
 const grid=document.querySelector(".blog-grid");if(!grid)return;
 const original=[...grid.querySelectorAll(".blog-card")];
 const filters=document.querySelector(".blog-categories");
 let posts;try{posts=await fetchPublished()}catch(error){console.warn("Blog feed:",error);return}
 if(!posts.length)return; // Preserve accessible old-blog article links until those articles have been imported.
 const publishedSlugs=new Set(posts.map(x=>x.slug));
 const categoryList=["All Posts",...new Set(posts.map(p=>p.category||"Insights"))];
 const articleHTML=post=>{
   const image=safeImage(post.cover_image_url);
   const url="blog-post.html?slug="+encodeURIComponent(post.slug);
   return '<article class="blog-card ae-live-blog-card" data-category="'+escapeHTML(post.category||"Insights")+'">'+
     '<a href="'+url+'" class="blog-image">'+(image?'<img src="'+escapeHTML(image)+'" alt="'+escapeHTML(post.title)+'" loading="lazy">':'<div class="ae-blog-image-fallback" aria-hidden="true">ANDRE ERVING</div>')+'</a>'+
     '<div class="blog-copy"><span class="tiny-tag">'+escapeHTML(post.category||"Insights")+'</span><h3><a href="'+url+'">'+escapeHTML(post.title)+'</a></h3>'+
     '<p>'+dateLabel(post.published_at)+' · '+Math.max(1,Math.ceil(String(post.body_html||"").replace(/<[^>]*>/g," ").split(/\s+/).length/225))+' min read</p>'+
     '<p class="ae-blog-excerpt">'+escapeHTML(post.excerpt||"")+'</p><a class="arrow-link" href="'+url+'">Read article →</a></div></article>';
 };
 const legacy=original.filter(card=>{
  const url=card.querySelector("a[href]")?.getAttribute("href")||"";
  const slug=url.split("/post/")[1]?.split(/[?#]/)[0];return !publishedSlugs.has(slug);
 });
 grid.innerHTML=posts.map(articleHTML).join("");
 if(legacy.length){
  const label=document.createElement("div");label.className="ae-blog-legacy-intro";
  label.innerHTML="<h2>More articles from the archive</h2><p>Explore articles from the original Andre Erving blog while the archive is being transferred.</p>";
  grid.parentElement.appendChild(label);
  const older=document.createElement("div");older.className="blog-grid ae-blog-legacy-grid";
  legacy.forEach(c=>older.appendChild(c));grid.parentElement.appendChild(older);
 }
 if(filters){
  filters.innerHTML=categoryList.map((name,i)=>'<button type="button" class="ae-blog-filter'+(i===0?" active":"")+'" data-category="'+escapeHTML(name)+'">'+escapeHTML(name)+'</button>').join("");
  filters.querySelectorAll("[data-category]").forEach(button=>button.onclick=()=>{
   filters.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b===button));
   const value=button.dataset.category;
   grid.querySelectorAll(".ae-live-blog-card").forEach(card=>card.hidden=value!=="All Posts"&&card.dataset.category!==value);
   const archive=grid.parentElement.querySelector(".ae-blog-legacy-grid"),intro=grid.parentElement.querySelector(".ae-blog-legacy-intro");
   if(archive)archive.hidden=value!=="All Posts";
   if(intro)intro.hidden=value!=="All Posts";
  });
 }
}
init();
