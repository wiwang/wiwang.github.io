import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/posts";
import { projects } from "@/lib/site";
import { Arrow } from "@/components/icons";
import { PostCard } from "@/components/post-card";
import { FeatureArt } from "@/components/feature-art";
export const metadata: Metadata = { alternates: { canonical: "/" } };
export default function Home() {
  const posts = getPosts();
  const featured = posts.find((p) => p.featured) ?? posts[0];
  return (
    <div className="wrap">
      <section className="hero">
        <div className="eyebrow">
          <span className="status-dot" /> NOTES FROM AN AI & ML ENGINEER
        </div>
        <h1>
          Thinking in models.
          <br />
          <span>Building with purpose.</span>
        </h1>
        <p className="hero-description">
          I’m Zhiyong, an AI and machine learning engineer.
          <br className="desktop-break" /> This is where I explore ideas in AI,
          unpack the fundamentals,
          <br className="desktop-break" /> and share what I learn along the way.
        </p>
        <div className="hero-links">
          <Link className="button-primary" href="/writing/">
            Explore the writing <Arrow />
          </Link>
          <Link className="text-link" href="/about/">
            A little about me <Arrow />
          </Link>
        </div>
        <div className="hero-note">
          <span>AI & MACHINE LEARNING</span>
          <span className="note-line" />
          <span>THEORY INTO PRACTICE</span>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>f(x)</span>
        </div>
      </section>
      {featured && (
        <section className="featured-section">
          <div className="section-heading">
            <h2 className="eyebrow">THE SPOTLIGHT</h2>
            <span className="section-aside">A good place to start</span>
          </div>
          <Link className="feature-card" href={`/${featured.slug}/`}>
            <div className="feature-copy">
              <span className="feature-badge">FEATURED ESSAY</span>
              <h2>{featured.title}</h2>
              <p>{featured.description}</p>
              <span className="feature-bottom">
                {featured.tags[0].replaceAll("-", " ")}
                <span>
                  Read the essay <Arrow />
                </span>
              </span>
            </div>
            <FeatureArt
              kind={
                featured.tags.includes("agentic-ai") ? "agent" : "bias-variance"
              }
            />
          </Link>
        </section>
      )}
      <section className="writing-section">
        <div className="section-heading">
          <h2>
            Latest writing
            <span className="count">
              {String(posts.length).padStart(2, "0")}
            </span>
          </h2>
          <Link className="text-link" href="/writing/">
            View all writing <Arrow />
          </Link>
        </div>
        {posts.slice(0, 3).map((post, i) => (
          <PostCard key={post.slug} post={post} index={i} />
        ))}
      </section>
      <section className="demo-teaser">
        <div>
          <span className="eyebrow">INTERACTIVE DEMO</span>
          <h2>What were you working on?</h2>
          <p>
            Explore how activity context becomes ranked Jira issue suggestions.
          </p>
        </div>
        <Link className="text-link" href="/demo/">
          Try it yourself →
        </Link>
      </section>
      <section className="home-projects">
        <div>
          <span className="eyebrow">BEYOND THE NOTEBOOK</span>
          <h2>Ideas, put to work.</h2>
          <p>Exploring how machine learning can solve practical problems.</p>
          <Link className="text-link" href="/projects/">
            Explore my projects <Arrow />
          </Link>
        </div>
        <div className="project-mini-list">
          {projects.map((p) => (
            <Link href={`/projects/${p.slug}/`} key={p.number}>
              <span>{p.number}</span>
              <h3>{p.title}</h3>
              <Arrow />
            </Link>
          ))}
        </div>
      </section>
      <section className="contact-strip">
        <span>Have an idea or a question?</span>
        <Link className="text-link" href="/contact/">
          Let’s connect <Arrow />
        </Link>
      </section>
    </div>
  );
}
