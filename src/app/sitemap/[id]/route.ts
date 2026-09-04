import { buildSitemapChunk } from "@/lib/sitemap/build";
import {
  SITEMAP_URLSET_RESPONSE_HEADERS,
  buildSitemapUrlsetXml,
  generateSitemapIds,
  parseSitemapChunkId,
} from "@/lib/sitemap/chunks";

export const dynamic = "force-static";
export const revalidate = 3600;

export function generateStaticParams(): Array<{ id: string }> {
  return generateSitemapIds().map(({ id }) => ({ id: `${id}.xml` }));
}

/** Части sitemap по стабильным URL `/sitemap/0.xml` … `/sitemap/4.xml`. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const chunkId = parseSitemapChunkId(id);

  if (chunkId === null || id !== `${chunkId}.xml`) {
    return new Response("Sitemap chunk not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const entries = await buildSitemapChunk(chunkId);
  return new Response(buildSitemapUrlsetXml(entries), {
    headers: SITEMAP_URLSET_RESPONSE_HEADERS,
  });
}
