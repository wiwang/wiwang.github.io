import type { Metadata } from "next";
import { getPosts } from "@/lib/posts";
import { WritingList } from "@/components/writing-list";
export const metadata: Metadata = {
  title: "Writing",
  description:
    "Essays and notes on machine learning, recommendation systems, and AI.",
  alternates: { canonical: "/writing/" },
};
export default function Writing() {
  const posts = getPosts({
    includeDrafts: process.env.NODE_ENV === "development",
  }).map((p) => ({ ...p, content: "" }));
  return (
    <div className="wrap page-wrap">
      <header className="page-heading">
        <span className="eyebrow">THE NOTEBOOK</span>
        <h1>
          Writing<span className="brand-dot">.</span>
        </h1>
        <p>
          Ideas, explanations, and things learned along the way.
          <br />
          From machine learning fundamentals to practical AI.
        </p>
      </header>
      <WritingList posts={posts} />
    </div>
  );
}
