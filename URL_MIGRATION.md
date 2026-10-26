# Wix → GitHub Pages URL migration checklist

Primary staging host: https://filings4u.github.io/andreerving/
Final intended public domain: https://www.andreerving.com/ after DNS moves away from the old platform.

## Page routes
The current sitemap lists 40 main routes, and all 40 have corresponding root-level HTML files in GitHub. Internal navigation is now linked to extensionless paths (for example `about` rather than `about.html`), preserving the existing path pattern when the final domain changes.

**Important**: GitHub Pages extensionless routing and all historical URLs must be checked with live browser requests before cutover. A file's existence alone does not prove a successful HTTP response.

## Blog-post routes on the old site needing content migration
These were located through public search. Matching article pages have **not** been imported yet:
- /post/embracing-change-the-key-to-a-better-life
- /post/success-in-the-trucking-industry-an-in-depth-look-at-the-trucking-pro-online-course
- /post/prioritizing-my-tasks-a-journey-to-productivity
- /post/celebrating-success-the-journey-to-andre-erving-s-mba
- /post/the-true-path-to-success-unpacking-albert-schweitzer-s-wisdom
- /post/understanding-freight-brokering-what-every-new-broker-needs-to-know
- /post/peak-performance-strategies-achieving-peak-performance-in-life

The old blog may contain additional posts not captured by this limited public search. Export or inventory all blog posts and media before disconnecting the old provider.

## Important migration notes
- The custom domain still points to the older site until DNS is updated separately. Do not change DNS before verifying GitHub Pages custom-domain settings and HTTPS.
- URLs for course buttons now lead to the new site's course inquiry form rather than back to legacy checkout. Checkout implementation is deferred.
- Keep the deleted DOT specimen collector training page out of migration, site maps, navigation, and listings.
- Verify canonical, Open Graph, sitemap, internal images, robots, analytics, and search console after the domain move.
- For old blog posts, preserve the original slug exactly under `/post/...` wherever possible. Keep original publishing dates and authored content when importing.
- Review all internal links and confirm that /about, /contact, /courses etc respond successfully under both staging and custom domains.
