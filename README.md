# Zhiyong Wang — personal site

A reading-focused AI/ML blog built with Next.js, React, TypeScript, Tailwind CSS, and Markdown/MDX. Statically exported to GitHub Pages at https://wiwang.github.io/.

## Run locally

Use Node.js **22.12 or newer** (Node 22 LTS recommended).

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Drafts are visible in the local writing index and at their own URLs during development. They are excluded from production pages, feeds, sitemap, and search.

## Write and publish a new post

### 1. Create a draft

From this repository's root, install dependencies if you have not already, then generate a post:

```bash
npm ci
npm run new-post -- "Understanding Embeddings"
```

The command creates:

```text
content/posts/understanding-embeddings.md   # Article text and metadata
public/posts/understanding-embeddings/     # Images and downloadable data
```

It fills in today's date in the America/Vancouver timezone and starts with `draft: true`. It refuses to overwrite an existing article. You can also create a `.md` file manually in `content/posts/`.

### 2. Edit the metadata

Open the generated Markdown file in your editor. Keep the frontmatter block at the very top:

```yaml
---
title: "Understanding Embeddings"
description: "How embeddings represent meaning, and how to evaluate their usefulness."
date: "2026-10-24"
slug: understanding-embeddings
tags: [machine-learning, embeddings]
draft: true
featured: false
---
```

| Field         | What to enter                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | The article title; the page renders it automatically.                                                                               |
| `description` | A concise summary used in listings and metadata.                                                                                    |
| `date`        | Original publication date, quoted as `YYYY-MM-DD`. Change it if you are publishing an older article.                                |
| `updated`     | Optional revision date, for example `updated: "2026-11-01"`. Keep the original `date` when revising.                                |
| `slug`        | A unique, permanent URL name. Use lowercase letters, numbers, and hyphens. This example becomes `/understanding-embeddings/`.       |
| `tags`        | At least one topic, written as a YAML list.                                                                                         |
| `draft`       | `true` while writing; `false` to include the post in the next deployment.                                                           |
| `featured`    | `true` to compete for the home-page spotlight. The newest featured post wins. Leave `false` to keep the current AI agent spotlight. |

A future `date` does **not** schedule publication. A draft is excluded from the production website, but its source is still readable in this public GitHub repository. Avoid changing a published slug because existing links use it.

### 3. Write the article body

Write below the closing `---`. Start sections with `##` and subsections with `###`; the title and table of contents are generated for you.

````markdown
## The problem

Explain the question, assumptions, and why it matters.

## A concrete example

Inline math: $s(q, d) = q^T d$.

```python
score = query_embedding @ document_embedding
```

| Approach        | Strength            | Limitation          |
| --------------- | ------------------- | ------------------- |
| Lexical search  | Exact identifiers   | Vocabulary mismatch |
| Dense retrieval | Semantic similarity | Requires evaluation |

## Key takeaways

Explain tradeoffs, failure cases, and what to measure.

## References

- [Original RAG paper](https://arxiv.org/abs/2005.11401)
````

Use `$$` on separate lines around display equations. Cite primary sources for technical claims, and label simulated data separately from measured results. Code blocks have syntax highlighting and a copy button. Tables can scroll on small screens.

### 4. Add images, plots, or vivid flow graphs

Put article assets in `public/posts/<slug>/`. In Markdown, their URL starts with `/posts/`, **not** `/public/posts/`. Use descriptive filenames and alt text. A linked image lets readers open a large diagram:

```markdown
[![The query passes through scope filtering, retrieval, reranking, and answer verification.](/posts/understanding-embeddings/retrieval-flow.svg)](/posts/understanding-embeddings/retrieval-flow.svg)

_Figure 1. The retrieval pipeline. Blue nodes retrieve evidence; green nodes validate it._
```

**For colorful flowcharts, export an SVG and embed it as above.** SVG stays sharp when enlarged. PNG is also supported. The blog currently does **not** render Mermaid code blocks as diagrams: a fenced `mermaid` block in an article will display source code, even though GitHub may render it in a README.

#### Option A: Draw the flow visually

1. Open [diagrams.net](https://app.diagrams.net/) and create a blank diagram.
2. Add rounded rectangles for stages, diamonds for decisions, and arrows for direction.
3. Group related stages with consistent colors—for example blue for retrieval, purple for model reasoning, and green for validation. Label decisions and arrows where their meaning is ambiguous.
4. Save the editable source as `public/posts/understanding-embeddings/retrieval-flow.drawio`.
5. Choose **File → Export As → SVG**, then save `retrieval-flow.svg` in the same folder. See the [official SVG export instructions](https://www.drawio.com/docs/manual/export/export-to-svg/) if labels are missing or clipped. Export PNG instead if SVG text does not display reliably.
6. Add the linked-image Markdown above and preview it on the site.

#### Option B: Describe the flow with Mermaid

Use the [Mermaid Live Editor](https://mermaid.live/) to turn text into a diagram ([official usage guide](https://mermaid.js.org/config/usage.html)). Paste the following source into the editor, without Markdown backtick fences:

```text
flowchart TD
    Q[User question] --> S[Resolve project and permissions]
    S --> R[Retrieve relevant evidence]
    R --> K[Rerank and select sources]
    K --> A[Generate a grounded answer]
    A --> V{Claims supported?}
    V -->|Yes| C[Answer with citations]
    V -->|No| G[Retrieve more or explain the gap]

    classDef context fill:#ede9fe,stroke:#7c3aed,color:#241445
    classDef retrieval fill:#dbeafe,stroke:#2563eb,color:#172554
    classDef reasoning fill:#fef3c7,stroke:#b45309,color:#451a03
    classDef verified fill:#dcfce7,stroke:#15803d,color:#14532d
    class Q,S context
    class R,K retrieval
    class A,V,G reasoning
    class C verified
```

Save that text as `public/posts/understanding-embeddings/retrieval-flow.mmd` so you can edit it later. Export the rendered diagram as SVG or PNG, put it alongside the source, and embed the exported image. When changing the flow, update both the source and image; the website build does not regenerate Mermaid files.

For readable diagrams, keep labels short, use a top-to-bottom layout for narrow screens, and split large architectures into an overview plus detail diagrams. Color should reinforce labels, not replace them. Check text contrast and whether labels remain readable on a phone. For animation or interactive stages, use a custom MDX component as described below; this requires a code change.

#### Plots and data tables

For experiments, keep the generator under `scripts/articles/` and commit its exported figures and data under `public/posts/<slug>/`. Follow [the existing reproducible experiments](scripts/articles/README.md). The website build uses the exported files and does not run Python.

Link downloadable data in your article:

```markdown
[Download the experiment results](/posts/understanding-embeddings/results.csv)
```

Only add that link after creating the file. Use a Markdown table for small results; use plots plus downloadable CSV files for larger experiments.

#### MDX captions and interactive content

Ordinary `.md` is enough for text and exported diagrams. Rename the article to `.mdx` if you need built-in components such as `Figure` or `Callout` (do not leave both versions with the same slug):

```mdx
<Figure
  src="/posts/understanding-embeddings/retrieval-flow.svg"
  alt="A retrieval pipeline with a claim verification decision"
  caption="Figure 1. Evidence retrieval and answer verification."
/>

<Callout>Evaluate evidence coverage before evaluating answer fluency.</Callout>
```

These two components are already registered. Custom interactive React components must be added to `src/components/` and registered in `src/lib/render-post.tsx`; use a client component when it needs browser state or interaction. In MDX prose, escape literal `<` and `{` characters outside code spans. See [the full authoring guide](docs/AUTHORING.md) for more examples.

### 5. Preview the draft locally

```bash
npm run dev
```

Open http://localhost:3000/writing/ and select the draft, or visit http://localhost:3000/understanding-embeddings/ directly. Save edits to refresh the preview. Check headings, math, tables, citations, image labels, and links. Also narrow the browser to a phone-sized width. GitHub's Markdown preview is not the final website preview.

### 6. Publish and verify

1. Set `draft: false` in the article frontmatter.
2. Stop the development server with `Ctrl+C`, then run:

   ```bash
   npm run typecheck
   npm test
   npm run build
   npm run preview
   ```

3. Open http://127.0.0.1:3000/understanding-embeddings/ to check the actual production export. The build checks metadata and internal links/assets; it does not assess the correctness of your claims or the readability of figures.
4. Review and commit the article and all its assets:

   ```bash
   git status
   git add content/posts/understanding-embeddings.md public/posts/understanding-embeddings/
   git commit -m "Publish Understanding Embeddings"
   git push origin master
   ```

   If you used MDX, stage the `.mdx` file instead. Also stage any experiment scripts or component changes you intentionally added. Empty asset folders are not tracked by Git; omit the asset path from `git add` if it contains no files.

5. Open [GitHub Actions](https://github.com/wiwang/wiwang.github.io/actions), select the latest **Build and deploy to GitHub Pages** run, and wait for both build and deploy to succeed.
6. Verify https://wiwang.github.io/understanding-embeddings/ and confirm the post appears under `/writing/`. No manual menu or index edits are needed.

For a later revision, edit the same file, keep its slug and publication date, add or update `updated`, then repeat the checks and commit/push steps. If deployment fails, inspect the failed Actions step; check for invalid dates, duplicate slugs, missing assets, and broken internal links first.

You can also create/edit the post through GitHub's **Add file → Create new file** interface in `content/posts/`, upload assets through **Add file → Upload files** in the corresponding public folder, and commit to `master`. Keep `draft: true` until ready. Local preview is the best way to review the complete article before publishing.

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

## Visit analytics

Visits are collected by [GoatCounter](https://www.goatcounter.com/) using the public endpoint `https://wiwang.goatcounter.com/count`. Sign in at [the analytics dashboard](https://wiwang.goatcounter.com/) to see site-wide trends and visits for each article URL. New posts are tracked automatically; no frontmatter changes are needed. The dashboard remains private. Public visit counts appear beside each published article’s date/reading time and in the footer as **Site visits**. The footer uses GoatCounter’s `TOTAL` counter, which aggregates page visits rather than distinct people across the site. `src/components/visit-count.tsx` reads the public counter API without credentials; keep **Allow adding visitor counts on your website** enabled. Counters may be cached for up to four hours and display an em dash when unavailable or not yet indexed. Reading a counter does not record a visit.

`src/components/analytics.tsx` loads the tracker only on `wiwang.github.io`. It records initial page loads and Next.js client-side route changes, including back/forward navigation. Local development and local production previews do not send visits. Query strings and URL fragments are excluded from tracked paths, and anchor clicks do not add visits. A failed or blocked analytics script does not prevent reading the site.

With **Sessions** enabled in GoatCounter, repeated visits to the same path are deduplicated within its session window. These counts are estimates, not a count of distinct people across all time; blockers and disabled JavaScript can prevent collection. Collection starts with this deployment and cannot reconstruct earlier traffic. To exclude your own browser, use GoatCounter **Settings → Tracking → disable for this browser**. See [sessions and visitors](https://www.goatcounter.com/help/sessions) for counting details. No account password or API token is stored in this repository.

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

## RSS subscriptions

The footer RSS link opens `/rss/`, a readable subscription page with a copyable feed URL and instructions. Feed readers and automatic discovery continue to use `https://wiwang.github.io/feed.xml`. It contains published article titles, summaries, canonical links, dates, and tags; drafts are excluded. A browser may show raw XML or download the feed, which does not subscribe the visitor automatically. Paste the feed URL into an RSS reader.

## Optional background music

The **Reading sounds** bar below the header offers original generative ambient soundscapes. Playback is attempted on arrival; browsers that block audible autoplay require Play. Visitors can pause or adjust the volume, and hear a topic-specific palette on each technical article. Playback continues through client-side page navigation; changing topics updates the notes for subsequent phrases. It pauses when the tab is hidden, and an explicit Pause preference is remembered on subsequent visits. No audio is downloaded or streamed. `src/lib/ambient-audio.ts` defines the soundscapes and synthesizes sine tones with soft envelopes using Web Audio; `src/components/music-player.tsx` provides accessible controls. New articles use the default Focus palette until a route mapping is added.

## Project case studies

Each project has a dedicated page under `/projects/<slug>/`, linked from the homepage and project index. Descriptions live in `src/lib/site.ts`, detailed Markdown in `content/projects/`, and conceptual flow diagrams in `public/projects/`. These pages separate resume-backed contributions from illustrative technical design discussion and do not publish private customer data or invented benchmark results.
