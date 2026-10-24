import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getPosts, parsePost } from "../src/lib/posts";
const fixture = (slug: string, draft: boolean) =>
  `---\ntitle: Test\ndescription: A test article\ndate: "2026-10-24"\nslug: ${slug}\ntags: [test]\ndraft: ${draft}\n---\n\n## A heading\n\nText.`;
test("drafts never enter the production post collection; local previews can include them", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "blog-content-"));
  try {
    fs.writeFileSync(
      path.join(directory, "published.md"),
      fixture("published", false),
    );
    fs.writeFileSync(
      path.join(directory, "draft.md"),
      fixture("private-draft", true),
    );
    assert.deepEqual(
      getPosts({ directory }).map((p) => p.slug),
      ["published"],
    );
    assert.equal(getPosts({ directory, includeDrafts: true }).length, 2);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
test("invalid metadata, impossible dates, reserved paths, and duplicate URLs fail early", () => {
  assert.throws(
    () => parsePost(fixture("writing", false), "reserved.md"),
    /reserved/,
  );
  assert.throws(
    () =>
      parsePost(
        fixture("valid", false).replace("2026-10-24", "2026-02-30"),
        "date.md",
      ),
    /calendar date/,
  );
  assert.throws(() =>
    parsePost(
      fixture("valid", false).replace("title: Test", 'title: ""'),
      "empty.md",
    ),
  );
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "blog-content-"));
  try {
    fs.writeFileSync(
      path.join(directory, "one.md"),
      fixture("duplicate", false),
    );
    fs.writeFileSync(
      path.join(directory, "two.md"),
      fixture("Duplicate", true),
    );
    assert.throws(() => getPosts({ directory }), /Duplicate slug/);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
test("migrated articles retain their original public slugs", () => {
  const slugs = getPosts().map((p) => p.slug);
  assert(slugs.includes("Bias-Variance"));
  assert(slugs.includes("recomendation"));
});

test("technical articles render equations, code, tables, footnotes, and unique heading anchors", async () => {
  const { renderPost } = await import("../src/lib/render-post");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const source = fs.readFileSync("content/posts/authoring-example.mdx", "utf8");
  const post = parsePost(source, "authoring-example.mdx");
  const { content, headings } = await renderPost(
    `${post.content}\n\n## Equations\n\nRepeated heading.`,
    post.format,
  );
  const html = renderToStaticMarkup(content);
  for (const marker of [
    "katex",
    "hljs",
    "<table",
    "data-footnote-ref",
    "callout",
    "Copy code",
  ])
    assert(html.includes(marker), `Missing rendered feature: ${marker}`);
  assert(headings.some((h) => h.id === "equations-1"));
  const plain = await renderPost(
    "## Plain Markdown\n\nUse x < 3 and {literal braces}.",
    "md",
  );
  assert(renderToStaticMarkup(plain.content).includes("literal braces"));
});

test("new-post command creates a valid draft and refuses to overwrite it", async () => {
  const { spawnSync } = await import("node:child_process");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "blog-authoring-"));
  try {
    fs.mkdirSync(path.join(directory, "content/posts"), { recursive: true });
    const script = path.resolve("scripts/new-post.mjs");
    const first = spawnSync(process.execPath, [script, "A new post"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.equal(first.status, 0, first.stderr);
    const file = path.join(directory, "content/posts/a-new-post.md");
    const original = fs.readFileSync(file, "utf8");
    const post = parsePost(original, file);
    assert.equal(post.draft, true);
    assert.equal(post.slug, "a-new-post");
    assert(fs.existsSync(path.join(directory, "public/posts/a-new-post")));
    const second = spawnSync(process.execPath, [script, "A new post"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.equal(second.status, 1);
    assert.equal(fs.readFileSync(file, "utf8"), original);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
