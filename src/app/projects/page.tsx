import Link from "next/link";
import type { Metadata } from "next";
import { projects } from "@/lib/site";
export const metadata: Metadata = {
  title: "Projects",
  description:
    "Projects exploring conversational AI, recommendation systems, and predictive modeling.",
  alternates: { canonical: "/projects/" },
};
export default function Projects() {
  return (
    <div className="wrap page-wrap">
      <header className="page-heading">
        <span className="eyebrow">THE WORKBENCH</span>
        <h1>
          Ideas into practice<span className="brand-dot">.</span>
        </h1>
        <p>
          A selection of projects I’ve worked on, exploring
          <br className="desktop-break" /> useful applications of machine
          learning.
        </p>
      </header>
      <section className="demo-teaser">
        <div>
          <span className="eyebrow">TRY THE INTERACTIVE DEMO</span>
          <h2>From activity to issue</h2>
          <p>
            Adjust activity signals and see how Jira issue suggestions change.
          </p>
        </div>
        <Link className="text-link" href="/demo/">
          Open the workbench →
        </Link>
      </section>
      <div className="project-grid">
        {projects.map((p) => (
          <article className="project-card" key={p.number}>
            <div className="project-card-top">
              <span>{p.number}</span>
              <span>{p.category}</span>
            </div>
            <div className="project-glyph" aria-hidden="true">
              {p.number === "01" ? "↔" : p.number === "02" ? "⋈" : "∿"}
            </div>
            <h2>
              <Link href={`/projects/${p.slug}/`}>{p.title}</Link>
            </h2>
            <p>{p.description}</p>
            <Link
              className="text-link project-detail-link"
              href={`/projects/${p.slug}/`}
            >
              Explore the project →
            </Link>
          </article>
        ))}
      </div>
      <aside className="info-note">
        Interested in the work? <a href="/contact/">Get in touch →</a>
      </aside>
    </div>
  );
}
