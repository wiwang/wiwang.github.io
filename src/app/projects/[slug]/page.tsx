import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/lib/site";
import { renderPost } from "@/lib/render-post";
export const dynamicParams = false;
export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description,
    alternates: { canonical: `/projects/${slug}/` },
  };
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();
  const source = fs.readFileSync(
    path.join(process.cwd(), "content/projects", `${project.slug}.md`),
    "utf8",
  );
  const { content, headings } = await renderPost(source, "md");
  return (
    <article className="wrap article-page project-case-study">
      <Link className="back-link" href="/projects/">
        ← All projects
      </Link>
      <header className="article-heading">
        <span className="eyebrow">PROJECT {project.number} · TEMPO</span>
        <h1>{project.title}</h1>
        <p className="article-description">{project.description}</p>
        <p className="post-meta">{project.category} · Engineering case study</p>
      </header>
      <section className="project-facts" aria-label="Project overview">
        <div>
          <span className="eyebrow">ENGINEERING FOCUS</span>
          <p>{project.focus}</p>
        </div>
        <div>
          <span className="eyebrow">MY CONTRIBUTION</span>
          <p>{project.delivered}</p>
        </div>
        <div>
          <span className="eyebrow">TECHNICAL STACK</span>
          <ul>
            {project.stack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
      <div className="article-layout">
        <div className="prose">
          {content}
          <div className="article-end">
            <span>Interested in this work?</span>
            <a href={`/contact/?subject=${encodeURIComponent(project.title)}`}>
              Discuss the project ↗
            </a>
          </div>
        </div>
        <aside className="toc">
          <div>
            <span className="eyebrow">IN THIS PROJECT</span>
            <nav aria-label="Project sections">
              {headings.map((h) => (
                <a key={h.id} href={`#${h.id}`}>
                  {h.text}
                </a>
              ))}
            </nav>
            <p>Experience and background</p>
            <Link className="text-link" href="/resume/">
              View resume ↗
            </Link>
          </div>
        </aside>
      </div>
      <section className="related-posts">
        <h2>More project work</h2>
        {projects
          .filter((p) => p.slug !== slug)
          .map((p) => (
            <Link
              className="project-related-link"
              key={p.slug}
              href={`/projects/${p.slug}/`}
            >
              <span>{p.title}</span>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
      </section>
    </article>
  );
}
