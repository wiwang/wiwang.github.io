import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import type { Root } from "mdast";
import { CodeBlock } from "@/components/code-block";
export async function renderPost(source: string, format: "md" | "mdx" = "mdx") {
  const headings: { id: string; text: string; depth: number }[] = [];
  function collectHeadings() {
    return (tree: Root) => {
      const slugger = new GithubSlugger();
      visit(tree, "heading", (node) => {
        const text = toString(node);
        const id = slugger.slug(text);
        if (node.depth <= 3) headings.push({ id, text, depth: node.depth });
      });
    };
  }
  const { content } = await compileMDX({
    source,
    components: {
      pre: CodeBlock,
      Callout: ({ children }: { children: React.ReactNode }) => (
        <aside className="callout">{children}</aside>
      ),
      Figure: ({
        src,
        alt,
        caption,
      }: {
        src: string;
        alt: string;
        caption: string;
      }) => (
        <figure>
          <img src={src} alt={alt} loading="lazy" />
          <figcaption>{caption}</figcaption>
        </figure>
      ),
    },
    options: {
      mdxOptions: {
        format,
        remarkPlugins: [remarkGfm, remarkMath, collectHeadings],
        rehypePlugins: [
          rehypeSlug,
          [rehypeKatex, { strict: "ignore" }],
          rehypeHighlight,
        ],
      },
    },
  });
  return { content, headings };
}
