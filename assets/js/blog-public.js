import {fetchPublished,escapeHTML,dateLabel,safeImage} from "./blog-shared.js?v=blog-shared-20261107b";
async function init(){
 const grid=document.querySelector(".ae-blog-listing .blog-grid");
 if(!grid)return;
 const filters=document.querySelector(".blog-categories");
 let posts;
 try{posts=await fetchPublished()}catch(error){
  console.warn("Blog feed:",error);
  grid.innerHTML='<p class="ae-post-status">Articles are temporarily unavailable. Please try again later.</p>';
  return;
 }
 if(!posts.length){
  grid.innerHTML='<p class="ae-post-status">New articles are being prepared for publication. Please check back soon.</p>';
  return;
 }
 const categories=["All Posts",...new Set(posts.map(p=>p.category||"Insights"))];
 const render=post=>{
  const cover=safeImage(post.cover_image_url),url="blog-post.html?slug="+encodeURIComponent(post.slug);
  const words=String(post.body_html||"").replace(/<[^>]*>/g," ").trim().split(/\s+/).length;
  return '<article class="blog-card" data-category="'+escapeHTML(post.category||"Insights")+'">'+
   '<a class="blog-image" href="'+url+'">'+(cover?'<img src="'+escapeHTML(cover)+'" alt="'+escapeHTML(post.title)+'" loading="lazy">':'<div class="ae-blog-image-fallback" aria-hidden="true">ANDRE ERVING</div>')+'</a>'+
   '<div class="blog-copy"><span class="tiny-tag">'+escapeHTML(post.category||"Insights")+'</span>'+
   '<h3><a href="'+url+'">'+escapeHTML(post.title)+'</a></h3>'+
   '<p>'+escapeHTML(dateLabel(post.published_at))+' · '+Math.max(1,Math.ceil(words/225))+' min read</p>'+
   (post.excerpt?'<p class="ae-blog-excerpt">'+escapeHTML(post.excerpt)+'</p>':'')+
   '<a class="arrow-link" href="'+url+'">Read article →</a></div></article>';
 };
 grid.innerHTML=posts.map(render).join("");
 if(filters){
  filters.innerHTML=categories.map((name,i)=>'<button type="button" class="ae-blog-filter'+(i===0?' active':'')+'" data-category="'+escapeHTML(name)+'">'+escapeHTML(name)+'</button>').join("");
  filters.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{
   filters.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b===button));
   grid.querySelectorAll(".blog-card").forEach(card=>{card.hidden=button.dataset.category!=="All Posts"&&card.dataset.category!==button.dataset.category;});
  }));
 }
}
init();
