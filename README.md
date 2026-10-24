# Zhiyong Wang — personal site

A reading-focused AI/ML blog built with Next.js, React, TypeScript, Tailwind CSS, and Markdown/MDX. Statically exported to GitHub Pages at https://wiwang.github.io/.

## Run locally

Use Node.js **22.12 or newer** (Node 22 LTS recommended).

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Drafts are visible in the local writing index and at their own URLs during development. They are excluded from production pages, feeds, sitemap, and search.

## Write a post

```bash
npm run new-post -- "Understanding Embeddings"
```

This creates `content/posts/understanding-embeddings.md` and an asset folder at `public/posts/understanding-embeddings/`. Edit the generated summary, tags, and body. Preview locally, then set `draft: false` when ready to publish.

See [the authoring guide](docs/AUTHORING.md) for equations, code, figures, MDX, and publishing.

## Check and preview production

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

The build validates all post metadata, exports to `out/`, and checks internal links, assets, article anchors, and legacy routes. The preview serves the actual export, including its custom 404, at http://127.0.0.1:3000. Stop the development server before starting the preview.

## Publish to GitHub Pages

1. In this repository’s **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. This replaces the old Jekyll branch build.
2. Commit and push to `master` (the current default branch) or `main`.
3. The included workflow installs the locked dependencies, checks types and tests, builds the static site, and deploys `out/` to Pages. Pull requests run checks without deploying.
4. Check the Actions run, then visit https://wiwang.github.io/.

There are no runtime services, database, CMS credentials, or paid hosting requirements. Deployment needs GitHub Pages enabled and the workflow’s Pages permissions allowed by repository settings.

## Customize

- Identity, links, project summaries: `src/lib/site.ts`
- Biography: `src/app/about/page.tsx`
- Background/contact: `src/app/resume/page.tsx`
- Layout and metadata: `src/app/layout.tsx`
- Design tokens, type, responsive styles: `src/app/globals.css`
- Home: `src/app/page.tsx`
- Content: `content/posts/`
- Public assets: `public/` (served at the site root)

The resume page and project summaries are based on the supplied Agentic AI Engineer resume. The public download is `public/resume/zhiyong-wang-resume.pdf`, with the phone number removed and metadata sanitized. The original private PDF is not stored in this repository. Contact email and professional profile links are retained. Resume content lives in `src/lib/resume.ts`.

## Migration

The two original articles have been rewritten as advanced technical guides, with a 2026-10-24 revision date, cited sources, and reproducible synthetic experiments. Figure generation instructions are in `scripts/articles/README.md`. Existing article URLs `/Bias-Variance/` and `/recomendation/` remain canonical, including their original spelling. `/about/` and `/resume/` remain available. `/project/` renders the project page with a canonical link to `/projects/`. `/feed.xml` continues to work, now as RSS. Existing image paths are preserved under `public/images/`.

The old Jekyll source is removed from the active tree; it remains available in Git history. No server redirects are required. Next.js is configured for static export with trailing slashes. Server-dependent Next.js features are deliberately avoided for GitHub Pages compatibility.
