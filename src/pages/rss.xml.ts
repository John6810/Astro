import rss from "@astrojs/rss";
import { getCollection, type CollectionEntry } from "astro:content";
import type { APIContext } from "astro";
import { withBase } from "../lib/url";

type BlogPost = CollectionEntry<"blog">;

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog", ({ data }: BlogPost) => !data.draft)).sort(
    (a: BlogPost, b: BlogPost) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: "Jonathan Aerts — Blog",
    description:
      "Senior Cloud Platform Architect — notes Azure / Terraform / AKS / plateformes cloud sous régulation.",
    site: context.site ?? "https://john6810.github.io",
    items: posts.map((p: BlogPost) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: withBase(`/blog/${p.id}/`),
      categories: p.data.tags,
    })),
    customData: "<language>fr-FR</language>",
  });
}
