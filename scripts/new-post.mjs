import fs from "node:fs";
import path from "node:path";
const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.error('Usage: npm run new-post -- "Your post title"');
  process.exit(1);
}
const slug = title
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
if (!slug) {
  console.error("Please include an English word or number for the URL slug.");
  process.exit(1);
}
if (
  [
    "writing",
    "projects",
    "project",
    "about",
    "contact",
    "resume",
    "feed",
    "404",
    "images",
    "posts",
    "next",
    "sitemap",
    "robots",
    "rss",
  ].includes(slug)
) {
  console.error(
    "That title creates a reserved URL; use a more specific title.",
  );
  process.exit(1);
}
const date = new Date().toLocaleDateString("en-CA", {
  timeZone: "America/Vancouver",
});
const file = path.join("content/posts", `${slug}.md`);
const content = `---\ntitle: ${JSON.stringify(title)}\ndescription: "Add a short summary of your article."\ndate: "${date}"\nslug: ${slug}\ntags: [machine-learning]\ndraft: true\nfeatured: false\n---\n\n## Introduction\n\nStart writing here.\n`;
try {
  fs.writeFileSync(file, content, { flag: "wx" });
  fs.mkdirSync(path.join("public/posts", slug), { recursive: true });
  console.log(
    `Created ${file}\nAssets: public/posts/${slug}/\nPreview: npm run dev, then visit /${slug}/\nSet draft: false to publish.`,
  );
} catch (error) {
  console.error(
    error.code === "EEXIST" ? `Post already exists: ${file}` : error.message,
  );
  process.exit(1);
}
