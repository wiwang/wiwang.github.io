import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { Arrow } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Nav } from "@/components/nav";
import "./globals.css";
import "katex/dist/katex.min.css";
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Machine Learning & AI`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_US",
    images: [{ url: "/social-card.png", width: 1200, height: 630 }],
  },
};
const themeScript = `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch{}`;
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header wrap">
          <Link href="/" className="brand" aria-label="Zhiyong Wang home">
            <span className="brand-photo photo-avatar">
              <img src={site.photo} alt="" width={36} height={36} />
            </span>
            <span>
              Zhiyong Wang<span className="brand-dot">.</span>
            </span>
          </Link>
          <div className="header-right">
            <Nav />
            <span className="nav-divider" />
            <ThemeToggle />
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer wrap">
          <div>
            <Link className="footer-name" href="/">
              Zhiyong Wang<span className="brand-dot">.</span>
            </Link>
            <p>Less is more. Keep learning.</p>
          </div>
          <div className="footer-links">
            <a href={site.github}>
              GitHub <Arrow />
            </a>
            <a href={site.linkedin}>
              LinkedIn <Arrow />
            </a>
            <a href="/feed.xml">
              RSS <Arrow />
            </a>
          </div>
          <p className="copyright">© {new Date().getFullYear()} Zhiyong Wang</p>
        </footer>
      </body>
    </html>
  );
}
