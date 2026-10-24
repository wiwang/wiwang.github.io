"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Post } from "@/lib/posts";
import { PostCard } from "./post-card";
function TagFromUrl({ onChange }: { onChange: (tag: string) => void }) {
  const params = useSearchParams();
  const tag = params.get("tag") ?? "all";
  useEffect(() => onChange(tag), [tag, onChange]);
  return null;
}
export function WritingList({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");
  const [requestedTag, setRequestedTag] = useState("all");
  const router = useRouter();
  const tags = [...new Set(posts.flatMap((p) => p.tags))].sort();
  const tag =
    requestedTag && tags.includes(requestedTag) ? requestedTag : "all";
  function selectTag(value: string) {
    const params = new URLSearchParams(window.location.search);
    setRequestedTag(value);
    if (value === "all") params.delete("tag");
    else params.set("tag", value);
    router.replace(`/writing/${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }
  const results = posts.filter(
    (p) =>
      (tag === "all" || p.tags.includes(tag)) &&
      `${p.title} ${p.description} ${p.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <Suspense fallback={null}>
        <TagFromUrl onChange={setRequestedTag} />
      </Suspense>
      <div className="search-field">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="6" />
          <path d="m15 15 5 5" />
        </svg>
        <label className="sr-only" htmlFor="search">
          Search articles
        </label>
        <input
          id="search"
          type="search"
          placeholder="Search articles, ideas, and topics…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            Clear
          </button>
        )}
      </div>
      <div className="filter-tags" aria-label="Filter by topic">
        {["all", ...tags].map((t) => (
          <button key={t} aria-pressed={tag === t} onClick={() => selectTag(t)}>
            {t === "all" ? "All topics" : t.replaceAll("-", " ")}
          </button>
        ))}
      </div>
      <div className="results-count" aria-live="polite">
        {results.length} {results.length === 1 ? "article" : "articles"}
      </div>
      <div>
        {results.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
        {results.length === 0 && (
          <div className="empty-state">
            <h2>No articles found</h2>
            <p>Try a different search or topic.</p>
            <button
              className="text-link"
              onClick={() => {
                setQuery("");
                selectTag("all");
              }}
            >
              Reset filters →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
