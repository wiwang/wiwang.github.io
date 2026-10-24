"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { Arrow } from "./icons";

export function EmailContact() {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [subject, setSubject] = useState("");
  useEffect(() => {
    setSubject(
      new URLSearchParams(window.location.search).get("subject") ?? "",
    );
  }, []);
  const gmail = new URL("https://mail.google.com/mail/");
  gmail.search = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: site.email,
    ...(subject ? { su: subject } : {}),
  }).toString();
  const mailto = `mailto:${site.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(site.email);
      setStatus("Email address copied.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setStatus(
        "The address is selected. Copy it and paste it into your email service.",
      );
    }
  }

  return (
    <div className="email-contact-card">
      <label htmlFor="contact-email" className="eyebrow">
        EMAIL ADDRESS
      </label>
      <div className="email-address-row">
        <input
          id="contact-email"
          ref={input}
          value={site.email}
          readOnly
          onFocus={(event) => event.target.select()}
          aria-describedby="email-copy-status"
        />
        <button className="button-primary" onClick={copyEmail}>
          Copy email
        </button>
      </div>
      <p id="email-copy-status" className="email-copy-status" role="status">
        {status || "Copy the address into your preferred email service."}
      </p>
      <div className="email-options">
        <a
          href={gmail.toString()}
          target="_blank"
          rel="noopener noreferrer"
          className="button-primary"
        >
          Compose in Gmail <Arrow />
        </a>
        <a href={mailto} className="text-link">
          Open email app <Arrow />
        </a>
      </div>
      <p className="email-option-note">
        Gmail opens in a new tab and may ask you to sign in. “Open email app”
        uses your device’s configured mail handler.
      </p>
    </div>
  );
}
