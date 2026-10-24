"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Public collection endpoint, not an API key. The dashboard stays private.
const endpoint = "https://wiwang.goatcounter.com/count";

declare global {
  interface Window {
    goatcounter?: {
      count?: (data: { path: string; title: string }) => void;
    };
  }
}

export function Analytics() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Never collect development, local production previews, or other deployments.
    if (location.hostname !== "wiwang.github.io") return;
    const script = document.createElement("script");
    script.src = "https://gc.zgo.at/count.js";
    script.async = true;
    script.dataset.goatcounter = endpoint;
    // We count explicitly for both initial loads and Next.js client navigation.
    script.dataset.goatcounterSettings = JSON.stringify({ no_onload: true });
    script.onload = () => setReady(true);
    document.body.appendChild(script);
    return () => {
      script.onload = null;
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || !pathname || !window.goatcounter?.count) return;
    // Exclude query strings and fragment changes; use the site's trailing slash URLs.
    const path = pathname === "/" ? "/" : `${pathname.replace(/\/$/, "")}/`;
    if (lastPath.current === path) return;
    const timer = setTimeout(() => {
      window.goatcounter?.count?.({ path, title: document.title });
      lastPath.current = path;
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, ready]);

  return null;
}
