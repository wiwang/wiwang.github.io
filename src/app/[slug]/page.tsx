import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPosts } from "@/lib/posts";
import { formatDate } from "@/lib/date";
import { renderPost } from "@/lib/render-post";
import { VisitCount } from "@/components/visit-count";
import { PostCard } from "@/components/post-card";
import { site } from "@/lib/site";
const includeDrafts = process.env.NODE_ENV === "development";
export const dynamicParams = false;
export function generateStaticParams() {
  return getPosts({ includeDrafts }).map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPosts({ includeDrafts }).find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/${post.slug}/` },
    robots: post.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/${post.slug}/`,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [site.name],
      tags: post.tags,
    },
  };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const posts = getPosts({ includeDrafts });
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();
  const { content, headings } = await renderPost(post.content, post.format);
  const related = posts
    .filter((p) => p.slug !== post.slug && !p.draft)
    .sort(
      (a, b) =>
        b.tags.filter((t) => post.tags.includes(t)).length -
        a.tags.filter((t) => post.tags.includes(t)).length,
    )
    .slice(0, 2);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Person", name: site.name, url: `${site.url}/about/` },
    mainEntityOfPage: `${site.url}/${post.slug}/`,
  };
  return (
    <article className="wrap article-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Link className="back-link" href="/writing/">
        ← All writing
      </Link>
      <header className="article-heading">
        <div className="tags">
          {post.tags.map((t) => (
            <Link href={`/writing/?tag=${encodeURIComponent(t)}`} key={t}>
              {t.replaceAll("-", " ")}
            </Link>
          ))}
        </div>
        {post.draft && (
          <p className="draft-label">DRAFT PREVIEW — not published</p>
        )}
        <h1>{post.title}</h1>
        <p className="article-description">{post.description}</p>
        <div className="article-byline">
          <span className="author-avatar photo-avatar">
            <img src={site.photo} alt="" width={36} height={36} />
          </span>
          <div>
            <Link href="/about/">Zhiyong Wang</Link>
            <div className="post-meta">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span>·</span>
              <span>{post.readingTime} min read</span>
              {!post.draft && (
                <>
                  <span>·</span>
                  <VisitCount path={`/${post.slug}/`} />
                </>
              )}
              {post.updated && <span>Updated {formatDate(post.updated)}</span>}
            </div>
          </div>
        </div>
      </header>
      <div className="article-layout">
        <div className="prose">
          {content}
          <div className="article-end">
            <span>Thanks for reading.</span>
            <a href={`/contact/?subject=${encodeURIComponent(post.title)}`}>
              Discuss this article ↗
            </a>
          </div>
        </div>
        <aside className="toc">
          <div>
            <span className="eyebrow">ON THIS PAGE</span>
            <nav aria-label="Table of contents">
              {headings.map((h) => (
                <a
                  href={`#${h.id}`}
                  key={h.id}
                  className={h.depth === 3 ? "toc-sub" : ""}
                >
                  {h.text}
                </a>
              ))}
            </nav>
            <p>A question or a different perspective?</p>
            <a className="text-link" href="/contact/">
              Let’s talk ↗
            </a>
          </div>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="related-posts">
          <h2>Keep exploring</h2>
          {related.map((p) => (
            <PostCard post={p} key={p.slug} />
          ))}
        </section>
      )}
    </article>
  );
}
