"use client";
import { useRef, useState, type ComponentPropsWithoutRef } from "react";
export function CodeBlock(props: ComponentPropsWithoutRef<"pre">) {
  const ref = useRef<HTMLPreElement>(null);
  const [status, setStatus] = useState("Copy");
  async function copy() {
    try {
      await navigator.clipboard.writeText(ref.current?.textContent ?? "");
      setStatus("Copied");
    } catch {
      setStatus("Copy failed");
    }
    setTimeout(() => setStatus("Copy"), 2000);
  }
  return (
    <div className="code-wrap">
      <div className="code-toolbar">
        <span>CODE</span>
        <button onClick={copy} aria-label="Copy code">
          {status}
        </button>
        <span className="sr-only" aria-live="polite">
          {status === "Copy" ? "" : status}
        </span>
      </div>
      <pre {...props} ref={ref} />
    </div>
  );
}
