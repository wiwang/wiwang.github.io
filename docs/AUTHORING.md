# Writing articles

## Start with a template

```bash
npm run new-post -- "Understanding Embeddings"
```

Or create a `.md` or `.mdx` file in `content/posts/` manually:

```yaml
---
title: "Understanding Embeddings"
description: "A short explanation that appears in listings and search previews."
date: "2026-10-24"
slug: understanding-embeddings
tags: [machine-learning, embeddings]
draft: true
featured: false
---
```

Titles, descriptions, quoted publication dates (`YYYY-MM-DD`), a unique URL slug, and at least one tag are required. Slugs use letters, numbers, and hyphens. Use lowercase for new posts. Dates are explicit; a future date does not schedule publication. `draft: false` publishes on the next deployment. `updated: "2026-11-01"` is optional. Set `featured: true` to spotlight a post on the home page; the newest featured post wins. If no post is featured, the newest published post is shown.

A missing `draft` field defaults to true. Do not change an existing slug casually: it is the permanent public URL. File names do not affect the URL. Drafts remain committed in Git and are not private source files; they are excluded from the built website.

## Preview

Run `npm run dev`, open `/writing/`, and select the article marked Draft, or navigate directly to `/<slug>/`. Save your file to refresh. All content and formatting are rendered locally; GitHub's own Markdown preview may differ for math and MDX.

## Headings and navigation

Start body sections at `##`, with `###` subsections. The page supplies the article title. Heading anchors and the table of contents are generated automatically. Duplicate headings get unique anchors.

## Equations

Use inline math: `$y = wx + b$`.

For a display equation, use:

```text
$$
\mathbb{E}[(y - \hat{f}(x))^2] = \operatorname{Bias}^2 + \operatorname{Variance} + \sigma^2
$$
```

KaTeX renders at build time. Very wide equations scroll horizontally on small screens.

## Code

Use fenced code blocks with a language. The site adds syntax highlighting and a copy button.

````markdown
```python
import numpy as np

embeddings = np.array([[0.1, 0.2], [0.3, 0.4]])
print(embeddings.shape)
```
````

## Figures

Put files in `public/posts/<slug>/`. Use absolute URLs starting with `/posts/`, rather than `/public/`.

```markdown
![A description of what the chart shows](/posts/understanding-embeddings/chart.png)
```

For a caption, use the built-in component in an **MDX** file:

```mdx
<Figure
  src="/posts/understanding-embeddings/chart.png"
  alt="Two embedding clusters"
  caption="Figure 1. Similar items occupy nearby regions."
/>
```

Give figures meaningful alt text and cite the source when appropriate.

## Tables, references, and footnotes

GitHub-flavored Markdown tables and footnotes are supported:

```markdown
| Model    | Accuracy |
| -------- | -------- |
| Baseline | 0.82     |

A claim supported by a reference.[^1]

[^1]: Author, [Paper title](https://example.com), 2026.
```

Use a `## References` section for longer bibliographies. Link to source papers and distinguish your own results from quoted findings.

## MDX and interactive components

Ordinary Markdown is enough for most articles. Rename to `.mdx` when you want React components. Built-in `Figure` and `Callout` components are available without imports:

```mdx
<Callout>A useful intuition or practical takeaway.</Callout>
```

Add custom interactive components to `src/components/`, mark them with `'use client'` when needed, and register them in `src/lib/render-post.tsx`. Use them by name in MDX. MDX is compiled from this trusted repository; do not load untrusted visitor content into the compiler. In MDX, escape literal `<` or `{` outside code spans, because they have JSX meaning.

## Publish

1. Check title, description, date, tags, figures, references, and spelling.
2. Set `draft: false`.
3. Run `npm run build`. It checks content and the exported internal links.
4. Commit and push to the publishing branch. GitHub Actions builds and deploys.

You can also add or edit Markdown files through GitHub’s browser editor. A local build gives the most useful preview before publication.
