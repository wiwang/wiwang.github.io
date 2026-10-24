import type { Metadata } from "next";
import Link from "next/link";
import { resume } from "@/lib/resume";
import { site } from "@/lib/site";
import { Arrow } from "@/components/icons";
export const metadata: Metadata = {
  title: "About",
  description: "About Zhiyong Wang, agentic AI and machine learning engineer.",
  alternates: { canonical: "/about/" },
};
export default function About() {
  return (
    <div className="wrap page-wrap">
      <header className="page-heading">
        <span className="eyebrow">THE PERSON BEHIND THE POSTS</span>
        <h1>
          Hi, I’m Zhiyong<span className="brand-dot">.</span>
        </h1>
        <p>
          AI engineer. Machine learning engineer.
          <br />
          Always a student.
        </p>
      </header>
      <div className="about-layout">
        <div className="about-copy">
          <h2>Making sense of complex ideas.</h2>
          <p>
            I build production AI agents and machine learning systems, with
            experience spanning MCP, retrieval, evaluation, and cloud
            infrastructure.
          </p>
          <p>
            At Tempo.io, I worked on agents with persistent memory, MCP clients
            and servers, RAG pipelines, and automated evaluation. Before that,
            my work spanned machine learning at Expedia and distributed systems
            at Calix and ZTE.
          </p>
          <p>
            This site is my space to think through AI and machine learning
            concepts, document what I learn, and share the ideas behind the
            work.
          </p>
          <h2>Education</h2>
          {resume.education.map((edu) => (
            <div className="education" key={edu.school}>
              <span className="eyebrow">{edu.school.toUpperCase()}</span>
              <h3>{edu.degree}</h3>
            </div>
          ))}
          <Link className="text-link" href="/resume/">
            View my resume <Arrow />
          </Link>
        </div>
        <aside className="about-aside">
          <img
            className="profile-photo"
            src={site.photo}
            alt="Zhiyong Wang"
            width={240}
            height={240}
          />
          <h2>Let’s connect.</h2>
          <p>Questions, ideas, or a shared interest in machine learning?</p>
          <a href={`mailto:${site.email}`} className="text-link">
            Send me an email <Arrow />
          </a>
          <div className="aside-socials">
            <a href={site.github}>GitHub ↗</a>
            <a href={site.linkedin}>LinkedIn ↗</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
