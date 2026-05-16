import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";

type BlogPost = CollectionEntry<"blog">;

interface Props {
  post: BlogPost;
}

// Per-post raw markdown — serves the source body of each blog entry with
// a small YAML-style preamble agents can parse, without needing to render
// the HTML page. Stays static (output: "static").

export async function getStaticPaths() {
  const posts = await getCollection("blog", ({ data }: BlogPost) => !data.draft);
  return posts.map((post: BlogPost) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

export const GET: APIRoute = async ({ props, site }) => {
  const { post } = props as Props;
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const origin = site ? site.toString().replace(/\/+$/, "") : "";
  const canonical = `${origin}${base}/blog/${post.id}/`;

  const pubDate = post.data.pubDate.toISOString().slice(0, 10);
  const updated = post.data.updatedDate ? post.data.updatedDate.toISOString().slice(0, 10) : null;
  const tags = post.data.tags.length ? post.data.tags.join(", ") : null;

  const metaLines = [
    `# ${post.data.title}`,
    "",
    `> ${post.data.description}`,
    "",
    `- Author: Jonathan Aerts`,
    `- Published: ${pubDate}`,
    updated ? `- Updated: ${updated}` : null,
    `- Language: ${post.data.lang}`,
    tags ? `- Tags: ${tags}` : null,
    `- Canonical: ${canonical}`,
  ].filter(Boolean);

  // The collection stores raw markdown in `body` — pass through unchanged.
  const body = post.body ?? "";

  const out = `${metaLines.join("\n")}\n\n---\n\n${body}\n`;

  return new Response(out, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
