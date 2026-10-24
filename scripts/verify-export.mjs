import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const pages = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "_next") walk(file);
    } else if (file.endsWith(".html")) pages.push(file);
  }
}
walk("out");
let count = 0;
for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const match of html.matchAll(
    /\b(?:href|src)="([^"?#]*)(?:\?[^"#]*)?(?:#([^"]*))?"/g,
  )) {
    const [raw, href, hash] = match;
    if (!href && hash) {
      assert(
        ids.has(decodeURIComponent(hash)),
        `Missing anchor #${hash} in ${page}`,
      );
      continue;
    }
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const target = path.join("out", decodeURIComponent(href));
    assert(
      fs.existsSync(target) || fs.existsSync(path.join(target, "index.html")),
      `Broken local link in ${page}: ${raw}`,
    );
    count++;
  }
}
for (const file of [
  "404.html",
  "feed.xml",
  "sitemap.xml",
  "robots.txt",
  ".nojekyll",
  "Bias-Variance/index.html",
  "recomendation/index.html",
  "project/index.html",
])
  assert(fs.existsSync(`out/${file}`), `Missing export: ${file}`);
console.log(
  `Verified ${pages.length} exported pages and ${count} local links/assets.`,
);
// Draft identifiers must not leak into the published article pages, index, feed, or sitemap.
const matter = (await import("gray-matter")).default;
const publicText = [...pages, "out/feed.xml", "out/sitemap.xml"]
  .map((p) => fs.readFileSync(p, "utf8"))
  .join("\n");
for (const name of fs
  .readdirSync("content/posts")
  .filter((n) => /\.mdx?$/.test(n))) {
  const { data } = matter(
    fs.readFileSync(path.join("content/posts", name), "utf8"),
  );
  if (data.draft !== false) {
    assert(
      !fs.existsSync(path.join("out", data.slug, "index.html")),
      `Draft route exported: ${data.slug}`,
    );
    assert(
      !publicText.includes(data.slug),
      `Draft leaked into published content: ${data.slug}`,
    );
  }
}
console.log("Verified drafts are excluded from the production export.");
