import Link from "next/link";
import type { Post } from "@/lib/posts";
import { formatDate } from "@/lib/date";
import { Arrow } from "./icons";
export function PostCard({ post, index }: { post: Post; index?: number }) {
  return (
    <article className="post-row">
      {index !== undefined && (
        <span className="post-number">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
      <div className="post-row-body">
        <div className="post-meta">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>·</span>
          <span>{post.readingTime} min read</span>
          {post.draft && <span className="draft-label">Draft</span>}
        </div>
        <h3>
          <Link href={`/${post.slug}/`}>{post.title}</Link>
        </h3>
        <p>{post.description}</p>
        <div className="tags">
          {post.tags.map((tag) => (
            <Link href={`/writing/?tag=${encodeURIComponent(tag)}`} key={tag}>
              {tag.replaceAll("-", " ")}
            </Link>
          ))}
        </div>
      </div>
      <Link
        className="post-arrow"
        href={`/${post.slug}/`}
        aria-label={`Read ${post.title}`}
      >
        <Arrow />
      </Link>
    </article>
  );
}
