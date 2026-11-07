#!/usr/bin/env python3
"""CI audit of generated and hand-authored public website SEO."""
from __future__ import annotations
import re
import sys
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]
DOMAIN="andreerving.com"
NONPUBLIC={"404.html","checkout.html","checkout-success.html","course-player.html","blog-post.html"}
def attr(items,name):
    return dict(items).get(name,"")
class Scan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta=[];self.links=[];self.images=[];self.title="";self._title=False;self.h1=0;self.viewport=False
    def handle_starttag(self,tag,attrs):
        if tag=="title":self._title=True
        elif tag=="meta":self.meta.append(dict(attrs))
        elif tag=="link":self.links.append(dict(attrs))
        elif tag=="img":self.images.append(dict(attrs))
        elif tag=="h1":self.h1+=1
    def handle_endtag(self,tag):
        if tag=="title":self._title=False
    def handle_data(self,data):
        if self._title:self.title+=data
    def getmeta(self,key,value):
        return next((m.get("content","") for m in self.meta if m.get(key,"").lower()==value),"")
    def canonical(self):
        return next((l.get("href","") for l in self.links if "canonical" in l.get("rel","").split()),"")

def load_sitemap(file):
    root=ET.parse(ROOT/file).getroot()
    ns={"s":"http://www.sitemaps.org/schemas/sitemap/0.9"}
    return [el.text.strip() for el in root.findall(".//s:loc",ns) if el.text]

def main():
    failures=[];warnings=[];checked=0
    locs=load_sitemap("sitemap.xml")+load_sitemap("blog-sitemap.xml")
    if len(set(locs))!=len(locs):failures.append("Duplicate sitemap URLs")
    sitemap=set(locs)
    for url in sitemap:
        parsed=urlparse(url)
        if parsed.scheme!="https" or parsed.hostname!=DOMAIN:
            failures.append(f"Noncanonical sitemap host: {url}");continue
        p=ROOT/(parsed.path.lstrip("/") or "index.html")
        if not p.is_file():failures.append(f"Sitemap points to missing page: {url}")
    titles={}
    for page in sorted(ROOT.rglob("*.html")):
        if ".git" in page.parts:continue
        rel=page.relative_to(ROOT).as_posix()
        html=page.read_text(encoding="utf-8",errors="replace")
        head=html.split("</head>",1)[0]
        parser=Scan();parser.feed(head)
        full=Scan();full.feed(html)
        checked+=1
        robots=parser.getmeta("name","robots").lower()
        public=rel not in NONPUBLIC and "noindex" not in robots
        if not parser.title.strip():failures.append(f"{rel}: missing title")
        elif public:
            normalized=parser.title.strip().lower()
            if normalized in titles:failures.append(f"Duplicate indexable title: {rel}, {titles[normalized]}")
            titles[normalized]=rel
        if not parser.getmeta("name","description") and public:failures.append(f"{rel}: missing meta description")
        if not parser.getmeta("name","viewport"):failures.append(f"{rel}: missing responsive viewport")
        if rel in NONPUBLIC and "noindex" not in robots:failures.append(f"{rel}: private/error page missing noindex")
        canonical=parser.canonical()
        if public:
            if not canonical:failures.append(f"{rel}: missing canonical")
            if not parser.getmeta("property","og:title"):failures.append(f"{rel}: missing Open Graph title")
            if not parser.getmeta("property","og:description"):failures.append(f"{rel}: missing Open Graph description")
            if not parser.getmeta("property","og:image"):failures.append(f"{rel}: missing Open Graph image")
            if not parser.getmeta("name","twitter:card"):failures.append(f"{rel}: missing Twitter card")
            if full.h1!=1:failures.append(f"{rel}: expected exactly one H1, found {full.h1}")
            if canonical and canonical not in sitemap:failures.append(f"{rel}: indexable canonical missing from sitemaps: {canonical}")
        elif canonical in sitemap and canonical.endswith(rel):failures.append(f"{rel}: noindex URL included in sitemap")
        for img in full.images:
            if "alt" not in img:failures.append(f"{rel}: image without alt attribute ({img.get('src','')})")
            src=img.get("src","")
            if src.startswith(("assets/","images/")):
                target=ROOT/src.split("?",1)[0].split("#",1)[0]
                if not target.is_file():failures.append(f"{rel}: missing image asset {src}")
    for item in failures:print("ERROR:",item)
    for item in warnings:print("WARN:",item)
    print(f"SEO audit: {checked} HTML files, {len(sitemap)} sitemap URLs, {len(failures)} errors")
    return 1 if failures else 0
if __name__=="__main__":sys.exit(main())
