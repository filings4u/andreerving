import {fetchPublished,escapeHTML,dateLabel,safeImage,sanitizeArticleHTML} from "./blog-shared.js?v=20261107";
async function init(){
 const mount=document.getElementById("public-blog-post");
 if(!mount)return;
 const slug=new URLSearchParams(location.search).get("slug")||"";
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){mount.innerHTML='<p class="ae-post-status">Article not found. <a href="blog.html">Return to Blog</a>.</p>';return}
 try{
  const rows=await fetchPublished("slug=eq."+encodeURIComponent(slug));
  if(!rows.length){mount.innerHTML='<p class="ae-post-status">This article is not published. <a href="blog.html">Browse all posts</a>.</p>';return}
  const post=rows[0],cover=safeImage(post.cover_image_url),body=sanitizeArticleHTML(post.body_html);
  document.title=(post.seo_title||post.title)+" | Andre Erving";
  const desc=(post.seo_description||post.excerpt||"").slice(0,165);
  document.querySelector('meta[name="description"]')?.setAttribute("content",desc);
  const canonical=document.querySelector('link[rel="canonical"]');
  if(canonical)canonical.href="https://andreerving.com/blog-post.html?slug="+encodeURIComponent(post.slug);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content",post.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content",desc);
  document.querySelector('meta[property="og:image"]')?.setAttribute("content",cover||"https://andreerving.com/assets/images/blog-growth.webp");
  mount.innerHTML='<div class="ae-post-content"><a class="ae-post-back" href="blog.html">← All articles</a>'+
   '<header class="ae-post-header"><p class="eyebrow">'+escapeHTML(post.category||"Insights")+'</p><h1>'+escapeHTML(post.title)+'</h1>'+
   '<div class="ae-post-meta">By '+escapeHTML(post.author_name||"Andre Erving")+' · '+dateLabel(post.published_at)+'</div>'+
   (post.excerpt?'<p class="ae-post-summary">'+escapeHTML(post.excerpt)+'</p>':'')+'</header>'+
   (cover?'<img class="ae-post-cover" src="'+escapeHTML(cover)+'" alt="'+escapeHTML(post.title)+'">':'')+
   '<div class="ae-post-body">'+body+'</div><footer class="ae-post-end"><a class="btn btn-primary" href="blog.html">Explore more articles →</a></footer></div>';
 }catch(err){mount.innerHTML='<p class="ae-post-status">Unable to load this article. <a href="blog.html">Return to Blog</a>.</p>';console.error(err)}
}
init();
