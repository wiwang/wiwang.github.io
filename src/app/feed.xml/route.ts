import { getPosts } from "@/lib/posts";
import { site } from "@/lib/site";
export const dynamic = "force-static";
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function GET() {
  const items = getPosts()
    .map(
      (p) =>
        `<item><title>${xml(p.title)}</title><link>${site.url}/${p.slug}/</link><guid isPermaLink="true">${site.url}/${p.slug}/</guid><description>${xml(p.description)}</description><pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>${p.tags.map((t) => `<category>${xml(t)}</category>`).join("")}</item>`,
    )
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(site.name)}</title><link>${site.url}/</link><description>${xml(site.description)}</description><language>en</language><atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`,
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
  );
}
