import type { Metadata } from "next";
import { EmailContact } from "@/components/email-contact";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Zhiyong Wang about AI, machine learning, or a project idea.",
  alternates: { canonical: "/contact/" },
};
export default function Contact() {
  return (
    <div className="wrap page-wrap narrow">
      <header className="page-heading">
        <span className="eyebrow">LET’S CONNECT</span>
        <h1>
          Say hello<span className="brand-dot">.</span>
        </h1>
        <p>
          Questions, ideas, or a shared interest in AI and machine learning?
          <br />
          I’d be happy to hear from you.
        </p>
      </header>
      <EmailContact />
      <div className="contact-profile-links">
        <a className="text-link" href={site.linkedin}>
          LinkedIn ↗
        </a>
        <a className="text-link" href={site.github}>
          GitHub ↗
        </a>
      </div>
    </div>
  );
}
