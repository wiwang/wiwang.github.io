"use client";

import { useEffect, useState } from "react";

export function VisitCount({ path }: { path: string }) {
  const [result, setResult] = useState<{ path: string; count: string } | null>(
    null,
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch(
      `https://wiwang.goatcounter.com/counter/${encodeURIComponent(path)}.json`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Counter unavailable");
        const data: unknown = await response.json();
        if (
          typeof data !== "object" ||
          data === null ||
          !("count" in data) ||
          typeof data.count !== "string" ||
          !/^[\d, .\u00a0\u202f]+$/.test(data.count)
        ) {
          throw new Error("Invalid counter response");
        }
        if (!controller.signal.aborted) setResult({ path, count: data.count });
      })
      .catch(() => {
        // Unavailable or not-yet-indexed counters must not appear as zero visits.
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [path]);

  const count = result?.path === path ? result.count : null;
  return (
    <span
      className="visit-count"
      title="Visits since tracking began. GoatCounter counts may take up to four hours to refresh."
    >
      {path === "TOTAL"
        ? `Site visits: ${count ?? "—"}`
        : `${count ?? "—"} visits`}
    </span>
  );
}
