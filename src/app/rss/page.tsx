import type { Metadata } from "next";
import { RssSubscribe } from "@/components/rss-subscribe";
export const metadata: Metadata = {
  title: "Subscribe via RSS",
  description:
    "Follow Zhiyong Wang’s AI and machine learning articles in your RSS reader.",
  alternates: { canonical: "/rss/" },
};
export default function RssPage() {
  return (
    <div className="wrap page-wrap narrow">
      <header className="page-heading">
        <span className="eyebrow">FOLLOW THE WRITING</span>
        <h1>
          Subscribe via RSS<span className="brand-dot">.</span>
        </h1>
        <p>Get new AI and machine learning articles in your feed reader.</p>
      </header>
      <RssSubscribe />
      <div className="prose">
        <h2>How to subscribe</h2>
        <ol>
          <li>Copy the feed URL above.</li>
          <li>
            Open your RSS reader and choose its option to add a feed or
            subscription.
          </li>
          <li>
            Paste the URL and confirm. New posts will appear when your reader
            checks for updates.
          </li>
        </ol>
        <p>
          The feed includes article titles, summaries, and links to read each
          full post. Opening the XML directly may show raw text or download a
          file; paste its URL into a feed reader to subscribe.
        </p>
      </div>
    </div>
  );
}
