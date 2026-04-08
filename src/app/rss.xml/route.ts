import { getAllPosts } from "@/lib/blog";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

export async function GET() {
  const allPosts = await getAllPosts();
  const sortedPosts = [...allPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const items = sortedPosts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_URL}/blog/${post.slug}/</link>
      <description><![CDATA[${post.description}]]></description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}/</guid>
      <category>${post.category}</category>
      <author>info@getmasterok.ru (${SITE_NAME})</author>${post.heroImage ? `
      <media:content url="${post.heroImage}" medium="image" />` : ""}
    </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${SITE_NAME} — Блог</title>
    <link>${SITE_URL}/blog/</link>
    <description>Статьи о строительстве, ремонте и расчёте материалов</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_URL}/og-image.png</url>
      <title>${SITE_NAME}</title>
      <link>${SITE_URL}/</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
