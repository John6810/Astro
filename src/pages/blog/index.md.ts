import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";

type BlogPost = CollectionEntry<"blog">;

// Markdown index of /blog/ — listing for agent consumption.
// Pulls metadata directly from the content collection so this stays in sync
// with the rendered HTML version automatically.

export const GET: APIRoute = async ({ site }) => {
  const posts = (await getCollection("blog", ({ data }: BlogPost) => !data.draft)).sort(
    (a: BlogPost, b: BlogPost) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const origin = site ? site.toString().replace(/\/+$/, "") : "";

  const header = `# Blog — Jonathan Aerts

Technical notes on Azure Landing Zone, Terraform / Terragrunt, AKS and cloud platforms under regulation.

Feed: ${origin}${base}/rss.xml
`;

  const body = posts.length
    ? posts
        .map((p: BlogPost) => {
          const date = p.data.pubDate.toISOString().slice(0, 10);
          const tags = p.data.tags.length ? `Tags: ${p.data.tags.join(", ")}` : "";
          const lang = p.data.lang ? `Lang: ${p.data.lang}` : "";
          const meta = [date, lang, tags].filter(Boolean).join(" · ");
          const url = `${origin}${base}/blog/${p.id}/`;
          const mdUrl = `${origin}${base}/blog/${p.id}.md`;
          return `## [${p.data.title}](${url})

${meta}

${p.data.description}

- HTML: ${url}
- Markdown: ${mdUrl}
`;
        })
        .join("\n")
    : "_No published article yet._\n";

  return new Response(`${header}\n${body}`, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
};
