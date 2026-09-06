import { getAllPosts } from "@/lib/blog";
import { buildBlogRssXml } from "@/lib/blog-rss";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = 60;

export async function GET() {
  const xml = buildBlogRssXml({
    posts: await getAllPosts(),
    siteUrl: SITE_URL,
    siteName: SITE_NAME,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
