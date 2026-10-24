import { getPosts } from "../src/lib/posts";
const posts = getPosts({ includeDrafts: true });
console.log(
  `Validated ${posts.length} posts (${posts.filter((p) => p.draft).length} drafts).`,
);
