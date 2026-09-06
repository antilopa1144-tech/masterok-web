import type { BlogPost } from "./blog";

type RssPost = Pick<
  BlogPost,
  "slug" | "title" | "description" | "content" | "date" | "category" | "heroImage"
> & {
  /** Full Ghost timestamps are preferred when the CMS provides them. */
  publishedAtIso?: string;
  updatedAtIso?: string;
  updatedAt?: string;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** CDATA cannot contain the closing marker verbatim. */
function cdata(value: string): string {
  return "<![CDATA[" + value.replaceAll("]]>", "]]]]><![CDATA[>") + "]]>";
}

function timestampOrFallback(value: string | undefined, fallback: string): string {
  const candidate = value ?? fallback;
  return Number.isNaN(new Date(candidate).getTime()) ? fallback : candidate;
}

export function getPostPublishedTimestamp(post: RssPost): string {
  return timestampOrFallback(post.publishedAtIso, post.date);
}

export function getPostFreshnessTimestamp(post: RssPost): string {
  return timestampOrFallback(
    post.updatedAtIso ?? post.updatedAt ?? post.publishedAtIso,
    post.date,
  );
}

function toRssDate(timestamp: string): string {
  return new Date(timestamp).toUTCString();
}

export function buildBlogRssXml(options: {
  posts: RssPost[];
  siteUrl: string;
  siteName: string;
}): string {
  const { posts, siteUrl, siteName } = options;
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(getPostPublishedTimestamp(b)).getTime() - new Date(getPostPublishedTimestamp(a)).getTime(),
  );
  const latestContentTimestamp = sortedPosts.reduce<string | undefined>((latest, post) => {
    const timestamp = getPostFreshnessTimestamp(post);
    return !latest || new Date(timestamp).getTime() > new Date(latest).getTime()
      ? timestamp
      : latest;
  }, undefined);
  const channelUrl = `${siteUrl}/blog/`;

  const items = sortedPosts.map((post) => {
    const postUrl = `${siteUrl}/blog/${post.slug}/`;
    return `    <item>
      <title>${cdata(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <description>${cdata(post.description)}</description>
      <content:encoded>${cdata(post.content)}</content:encoded>
      <pubDate>${escapeXml(toRssDate(getPostPublishedTimestamp(post)))}</pubDate>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <category>${cdata(post.category)}</category>
      <author>${escapeXml(`info@getmasterok.ru (${siteName})`)}</author>${post.heroImage ? `
      <media:content url="${escapeXml(post.heroImage)}" medium="image" />` : ""}
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${cdata(`${siteName} — Блог`)}</title>
    <link>${escapeXml(channelUrl)}</link>
    <description>${cdata("Статьи о строительстве, ремонте и расчёте материалов")}</description>
    <language>ru</language>${latestContentTimestamp ? `
    <lastBuildDate>${escapeXml(toRssDate(latestContentTimestamp))}</lastBuildDate>` : ""}
    <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${escapeXml(`${siteUrl}/og-image.png`)}</url>
      <title>${cdata(siteName)}</title>
      <link>${escapeXml(`${siteUrl}/`)}</link>
    </image>
${items}
  </channel>
</rss>`;
}
