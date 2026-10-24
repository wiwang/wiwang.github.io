import Link from "next/link";
import type { Metadata } from "next";
import { site, projects } from "@/lib/site";
import { resume } from "@/lib/resume";
import { Arrow } from "@/components/icons";
export const metadata: Metadata = {
  title: "Resume",
  description:
    "Zhiyong Wang — Agentic AI Engineer. Experience in production AI agents, MCP, retrieval, evaluation, and machine learning.",
  alternates: { canonical: "/resume/" },
};
export default function Resume() {
  return (
    <div className="wrap page-wrap resume-page">
      <header className="page-heading">
        <span className="eyebrow">EXPERIENCE & BACKGROUND</span>
        <h1>
          Zhiyong Wang<span className="brand-dot">.</span>
        </h1>
        <p>{resume.role}</p>
        <div className="resume-contact">
          <Link href="/contact/">Email ↗</Link>
          <a href={site.linkedin}>LinkedIn ↗</a>
          <a href={site.github}>GitHub ↗</a>
        </div>
        <a
          className="button-primary resume-download"
          href="/resume/zhiyong-wang-resume.pdf"
          download
        >
          Download resume <Arrow />
        </a>
      </header>
      <div className="resume-layout">
        <div>
          <section className="resume-section">
            <h2>Profile</h2>
            <p>{resume.summary}</p>
          </section>
          <section className="resume-section">
            <h2>Experience</h2>
            {resume.experience.map((job) => (
              <article className="resume-job" key={job.company}>
                <div className="resume-job-heading">
                  <div>
                    <h3>{job.title}</h3>
                    <p className="resume-company">
                      {job.company}
                      {job.type ? ` · ${job.type}` : ""}
                    </p>
                  </div>
                  <span className="resume-dates">{job.dates}</span>
                </div>
                <ul>
                  {job.highlights.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
          <section className="resume-section">
            <h2>Selected projects</h2>
            {projects.map((project) => (
              <article className="resume-project" key={project.number}>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
              </article>
            ))}
          </section>
        </div>
        <aside>
          <section className="resume-section">
            <h2>Technical skills</h2>
            <dl className="resume-skills">
              {resume.skills.map((skill) => (
                <div key={skill.label}>
                  <dt>{skill.label}</dt>
                  <dd>{skill.text}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="resume-section">
            <h2>Education</h2>
            {resume.education.map((edu) => (
              <div className="resume-education" key={edu.school}>
                <h3>{edu.degree}</h3>
                <p>{edu.school}</p>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
