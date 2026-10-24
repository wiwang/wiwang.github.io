"use client";

import { useRef, useState } from "react";
import { site } from "@/lib/site";

export function RssSubscribe() {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const url = `${site.url}/feed.xml`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Feed URL copied. Paste it into your RSS reader.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setStatus("The feed URL is selected. Copy it into your RSS reader.");
    }
  }
  return (
    <div className="email-contact-card">
      <label htmlFor="rss-url" className="eyebrow">
        RSS FEED URL
      </label>
      <div className="email-address-row">
        <input
          id="rss-url"
          ref={input}
          value={url}
          readOnly
          onFocus={(event) => event.target.select()}
          aria-describedby="rss-status"
        />
        <button className="button-primary" onClick={copy}>
          Copy feed URL
        </button>
      </div>
      <p id="rss-status" className="email-copy-status" role="status">
        {status || "Add this URL to your preferred RSS reader."}
      </p>
      <a className="text-link" href="/feed.xml">
        Open raw XML feed ↗
      </a>
    </div>
  );
}
