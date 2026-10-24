import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/posts";
import { site, projects } from "@/lib/site";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...[
      "/",
      "/writing/",
      "/projects/",
      "/about/",
      "/contact/",
      "/resume/",
      "/rss/",
    ].map((p) => ({
      url: `${site.url}${p}`,
    })),
    ...projects.map((p) => ({ url: `${site.url}/projects/${p.slug}/` })),
    ...getPosts().map((p) => ({
      url: `${site.url}/${p.slug}/`,
      lastModified: new Date(p.updated ?? p.date),
    })),
  ];
}
