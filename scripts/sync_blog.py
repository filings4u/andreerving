#!/usr/bin/env python3
"""Build SEO-ready static blog pages from *published* Supabase articles.

Only the public Supabase publishable key is used. No draft or service-role data
is downloaded. This script runs in GitHub Actions and writes blog/*.html.
"""
from __future__ import annotations

from datetime import datetime, timezone
from html import escape
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit, unquote
from bs4 import BeautifulSoup
from bleach import clean
from bleach.css_sanitizer import CSSSanitizer
import json
import re

API = "https://gnfyidajbectlppsekzj.supabase.co/rest/v1/blog_posts"
KEY = "sb_publishable_DGt4HrHAwWyMt-0Xtzlfog_F18RnOyf"
SITE = "https://andreerving.com"
OUT = Path("blog")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TAGS = {"p","br","h2","h3","h4","strong","b","em","i","u","s","ul","ol","li",
        "blockquote","a","img","hr","div","span","figure","figcaption","pre","code",
        "table","tbody","thead","tr","td","th","iframe","sup","sub"}
CSS = CSSSanitizer(allowed_css_properties={
    "color", "background-color", "font-family", "font-size", "line-height",
    "margin-bottom", "text-align", "text-decoration", "width"
})

def url_is_image(value):
    try:
        v = urlsplit(value or "")
        return v.scheme in ("https", "http") and bool(v.netloc)
    except ValueError:
        return False

def safe_embed(value):
    try:
        v = urlsplit(value or "")
        if v.scheme != "https": return False
        return (
            v.hostname in ("www.youtube-nocookie.com", "www.youtube.com")
            and re.fullmatch(r"/embed/[A-Za-z0-9_-]{11}", v.path) is not None
        ) or (
            v.hostname == "player.vimeo.com"
            and re.fullmatch(r"/video/[0-9]+", v.path) is not None
        )
    except ValueError:
        return False

def attrs(tag, name, value):
    if name == "style": return tag in TAGS
    if tag == "a": return name == "href" and (
        value.startswith(("https://", "http://", "mailto:", "#", "/"))
    )
    if tag == "img": return name == "alt" or (name == "src" and url_is_image(value))
    if tag == "iframe": return name == "src" and safe_embed(value)
    return False

def fingerprint(value):
    try:
        p = urlsplit(value or "")
        return (p.hostname or "").lower() + (unquote(p.path).split("/v1/")[0] if (p.hostname or "").endswith("wixstatic.com") else unquote(p.path)).lower()
    except ValueError:
        return ""

def safe_body(body, cover):
    parsed = BeautifulSoup(body or "", "html.parser")
    # The cover is rendered exactly once above the article, never in the body again.
    if cover:
        for image in list(parsed.select("img[src]")):
            if fingerprint(image.get("src", "")) == fingerprint(cover):
                figure = image.find_parent("figure")
                if figure and len(figure.select("img")) == 1: figure.decompose()
                else: image.decompose()
    return clean(str(parsed), tags=TAGS, attributes=attrs, css_sanitizer=CSS,
                 protocols={"http", "https", "mailto"}, strip=True)

def get_posts():
    query = "?select=*&status=eq.published&order=published_at.desc&limit=1000"
    req = Request(API + query, headers={"apikey": KEY, "Accept": "application/json"})
    with urlopen(req, timeout=25) as resp:
        if resp.status != 200: raise RuntimeError("Blog API did not succeed")
        result = json.load(resp)
        if not isinstance(result, list): raise ValueError("Blog API returned non-list")
        return result

def article(post):
    slug = str(post["slug"])
    url = f"{SITE}/blog/{slug}.html"
    title = escape(str(post.get("title") or "Article"))
    seo_title = escape(str(post.get("seo_title") or post["title"]))
    description = escape(str(post.get("seo_description") or post.get("excerpt") or ""))
    social_title = escape(str(post.get("seo_og_title") or post.get("seo_title") or post["title"]))
    social_desc = escape(str(post.get("seo_og_description") or post.get("seo_description") or post.get("excerpt") or ""))
    cover = str(post.get("cover_image_url") or "")
    social_image = str(post.get("seo_og_image_url") or cover)
    if not url_is_image(social_image): social_image = f"{SITE}/assets/images/blog-growth.webp"
    if not url_is_image(cover): cover = ""
    cover_alt = escape(str(post.get("seo_image_alt") or post["title"]))
    author = escape(str(post.get("author_name") or "Andre Erving"))
    category = escape(str(post.get("category") or "Insights"))
    body = safe_body(post.get("body_html") or "", cover)
    excerpt = escape(str(post.get("excerpt") or ""))
    published = escape(str(post.get("published_at") or ""))
    modified = escape(str(post.get("updated_at") or post.get("published_at") or ""))
    robots = "index,follow,max-image-preview:large" if post.get("seo_indexable") is not False else "noindex,follow"
    schema = json.dumps({
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": str(post["title"]), "description": str(post.get("seo_description") or post.get("excerpt") or ""),
        "datePublished": post.get("published_at"), "dateModified": post.get("updated_at") or post.get("published_at"),
        "mainEntityOfPage": url, "author": {"@type": "Person", "name": str(post.get("author_name") or "Andre Erving")},
        "publisher": {"@type": "Organization", "name": "Andre Erving"},
        "image": cover or None,
        "keywords": str(post.get("seo_focus_keyword") or ", ".join(post.get("tags") or []))
    }, ensure_ascii=False).replace("<", "\\u003c")
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="{SITE}/">
<title>{seo_title} | Andre Erving</title>
<meta name="description" content="{description}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Andre Erving">
<meta property="og:url" content="{url}"><meta property="og:title" content="{social_title}">
<meta property="og:description" content="{social_desc}"><meta property="og:image" content="{escape(social_image)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{social_title}">
<meta name="twitter:description" content="{social_desc}"><meta name="twitter:image" content="{escape(social_image)}">
<meta property="article:published_time" content="{published}">
<meta property="article:modified_time" content="{modified}">
<link rel="stylesheet" href="assets/css/style.css?v=compact-20261107">
<link rel="stylesheet" href="assets/css/blog-public.css?v=seo-20261107">
<link rel="icon" href="images/fav.png" type="image/png">
<script type="application/ld+json">{schema}</script></head><body>
<header class="site-header"></header>
<main class="ae-post-wrapper"><article class="ae-post-content">
<a class="ae-post-back" href="blog.html">← All articles</a>
<header class="ae-post-header"><p class="eyebrow">{category}</p><h1>{title}</h1>
<div class="ae-post-meta">By {author}</div>
{f'<p class="ae-post-summary">{excerpt}</p>' if excerpt else ''}</header>
{f'<img class="ae-post-cover" src="{escape(cover)}" alt="{cover_alt}" loading="eager">' if cover else ''}
<div class="ae-post-body">{body}</div>
<footer class="ae-post-end"><a class="btn btn-primary" href="blog.html">Explore more articles</a></footer>
</article></main><footer class="site-footer"></footer><div class="toast" role="status" aria-live="polite"></div>
<script src="assets/js/site-shell.js?v=blog-layout-20261107"></script>
<script src="assets/js/main.js?v=dynamic-site-20261107"></script>
</body></html>'''

def main():
    posts = get_posts()
    OUT.mkdir(exist_ok=True)
    managed = set()
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    now = datetime.now(timezone.utc)
    for post in posts:
        slug = str(post.get("slug") or "")
        if not SLUG.fullmatch(slug) or not post.get("body_html"): continue
        when = post.get("published_at")
        if not when: continue
        try: published = datetime.fromisoformat(when.replace("Z", "+00:00"))
        except (ValueError, TypeError): continue
        if published > now: continue
        filename = OUT / f"{slug}.html"
        filename.write_text(article(post), encoding="utf-8")
        managed.add(filename.name)
        if post.get("seo_indexable") is not False:
            sitemap.append(f'<url><loc>{SITE}/blog/{slug}.html</loc>'
                           f'<lastmod>{str(post.get("updated_at") or when)[:10]}</lastmod></url>')
    for old in OUT.glob("*.html"):
        if old.name not in managed: old.unlink()
    sitemap.append('</urlset>')
    Path("blog-sitemap.xml").write_text("\n".join(sitemap)+"\n", encoding="utf-8")
    print(f"Generated {len(managed)} static published article pages.")

if __name__ == "__main__":
    main()
