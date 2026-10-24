import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/posts";
import { site } from "@/lib/site";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["/", "/writing/", "/projects/", "/about/", "/resume/"].map((p) => ({
      url: `${site.url}${p}`,
    })),
    ...getPosts().map((p) => ({
      url: `${site.url}/${p.slug}/`,
      lastModified: new Date(p.updated ?? p.date),
    })),
  ];
}
