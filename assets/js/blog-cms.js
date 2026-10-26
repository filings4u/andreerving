import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://gnfyidajbectlppsekzj.supabase.co','sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf');
const node=document.getElementById('cms-post-list');
if(node){
 const {data,error}=await db.from('blog_posts').select('slug,title,excerpt,published_at').eq('status','published').order('published_at',{ascending:false}).limit(50);
 if(error){node.textContent='Articles are temporarily unavailable.'}
 else if(!data?.length){node.textContent='More articles are coming soon.'}
 else{
  node.replaceChildren();
  for(const post of data){
   const card=document.createElement('article');card.className='catalog-card';card.style.padding='24px';
   const title=document.createElement('h3');title.textContent=post.title;card.append(title);
   if(post.excerpt){const p=document.createElement('p');p.textContent=post.excerpt;card.append(p)}
   const a=document.createElement('a');a.textContent='Read article';a.className='arrow-link';a.href='article.html?slug='+encodeURIComponent(post.slug);card.append(a);node.append(card)
  }
 }
}
const content=document.getElementById('cms-article');
if(content){
 const slug=new URLSearchParams(location.search).get('slug');
 if(!slug||!/^[a-z0-9-]{3,160}$/.test(slug)){content.textContent='Article not found.'}
 else{
  const {data,error}=await db.from('blog_posts').select('title,body_html,author_name,published_at').eq('slug',slug).eq('status','published').maybeSingle();
  if(error||!data){content.textContent='Article not found.'}
  else{
   const h=document.createElement('h1');h.textContent=data.title;content.append(h);
   const p=document.createElement('p');p.textContent=[data.author_name,data.published_at?new Date(data.published_at).toLocaleDateString():null].filter(Boolean).join(' · ');content.append(p);
   // Render as plain text until server-side HTML sanitation is installed.
   const body=document.createElement('div');body.className='article-text';body.textContent=(data.body_html||'').replace(/<\/?(?:p|h[1-6]|li|div|br)[^>]*>/gi,'\n').replace(/<[^>]*>/g,'');body.style.whiteSpace='pre-wrap';content.append(body);
   document.title=data.title+' — Andre Erving';
  }
 }
}
