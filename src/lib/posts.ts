import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid calendar date",
  );
export const postSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  date: dateSchema,
  updated: dateSchema.optional(),
  tags: z.array(z.string().trim().min(1)).min(1),
  draft: z.boolean().default(true),
  featured: z.boolean().default(false),
  slug: z.string().regex(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/),
});
export type Post = z.infer<typeof postSchema> & {
  content: string;
  format: "md" | "mdx";
  readingTime: number;
};
const reserved = new Set([
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
  "_next",
  "sitemap",
  "robots",
  "rss",
]);
export function parsePost(source: string, filename: string): Post {
  const { data, content } = matter(source);
  const result = postSchema.safeParse(data);
  if (!result.success) throw new Error(`${filename}: ${result.error.message}`);
  if (reserved.has(result.data.slug.toLowerCase()))
    throw new Error(`${filename}: reserved slug`);
  return {
    ...result.data,
    content,
    format: filename.endsWith(".mdx") ? "mdx" : "md",
    readingTime: Math.max(1, Math.ceil(content.split(/\s+/).length / 220)),
  };
}
export function getPosts({
  includeDrafts = false,
  directory = path.join(process.cwd(), "content/posts"),
} = {}): Post[] {
  const posts = fs
    .readdirSync(directory)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => parsePost(fs.readFileSync(path.join(directory, f), "utf8"), f));
  const slugs = new Set<string>();
  for (const post of posts) {
    if (slugs.has(post.slug.toLowerCase()))
      throw new Error(`Duplicate slug: ${post.slug}`);
    slugs.add(post.slug.toLowerCase());
  }
  return posts
    .filter((p) => includeDrafts || !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}
