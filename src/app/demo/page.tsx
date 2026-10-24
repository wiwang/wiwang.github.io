import type { Metadata } from "next";
import Link from "next/link";
import { RankingDemo } from "@/components/ranking-demo";
export const metadata: Metadata = {
  title: "Interactive Jira ranking demo",
  description:
    "Explore how activity context, user history, and recency change synthetic Jira issue and timesheet suggestions.",
  alternates: { canonical: "/demo/" },
};
export default function DemoPage() {
  return (
    <div className="wrap page-wrap demo-page">
      <header className="page-heading">
        <span className="eyebrow">INTERACTIVE WORKBENCH</span>
        <h1>
          From activity to issue<span className="brand-dot">.</span>
        </h1>
        <p>
          Which Jira issue were you working on? Change the signals, inspect the
          ranking, and choose a timesheet suggestion.
        </p>
      </header>
      <RankingDemo />
      <aside className="info-note">
        Inspired by my work on missing issue keys and timesheet ranking at
        Tempo. All issues and signals here are fictional.{" "}
        <Link href="/recomendation/">Read the technical article →</Link>
      </aside>
      <div className="contact-profile-links">
        <Link className="text-link" href="/projects/semantic-search-jira/">
          Explore the related project ↗
        </Link>
      </div>
    </div>
  );
}
