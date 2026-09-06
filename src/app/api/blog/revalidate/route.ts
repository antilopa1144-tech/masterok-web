import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { BLOG_CACHE_TAG } from "@/lib/blog-cache";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_IDENTIFIER_LENGTH = 200;
const EVENTS = new Set(["published", "edited", "unpublished", "deleted"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type PublicationEvent = {
  event: string;
  postId: string;
  revision: string;
  slug: string;
  previousSlug?: string;
};

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ accepted: false, error }, { status });
}

function getConfiguredSecret(): string | null {
  const secret = process.env.BLOG_REVALIDATE_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function hasValidBearerToken(authorization: string | null, secret: string): boolean {
  const match = /^Bearer (.+)$/.exec(authorization ?? "");
  if (!match) return false;

  const received = Buffer.from(match[1], "utf8");
  const expected = Buffer.from(secret, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function readBodyWithinLimit(request: Request): Promise<string | null> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_BODY_BYTES) {
    return null;
  }

  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MAX_IDENTIFIER_LENGTH
    && value.trim() === value;
}

function isSlug(value: unknown): value is string {
  return isBoundedIdentifier(value) && SLUG_PATTERN.test(value);
}

function parsePublicationEvent(value: unknown): PublicationEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const allowedKeys = new Set(["event", "postId", "revision", "slug", "previousSlug"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) return null;
  if (typeof body.event !== "string" || !EVENTS.has(body.event)) return null;
  if (!isBoundedIdentifier(body.postId) || !isBoundedIdentifier(body.revision) || !isSlug(body.slug)) {
    return null;
  }
  if (body.previousSlug !== undefined && !isSlug(body.previousSlug)) return null;

  return {
    event: body.event,
    postId: body.postId,
    revision: body.revision,
    slug: body.slug,
    ...(body.previousSlug === undefined ? {} : { previousSlug: body.previousSlug }),
  };
}

function invalidatePublishedBlogCache(): void {
  revalidateTag(BLOG_CACHE_TAG);
  revalidatePath("/blog/");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/blog/tag/[tag]", "page");
  revalidatePath("/");
  revalidatePath("/kalkulyatory/[category]", "page");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap/0.xml");
  revalidatePath("/sitemap/4.xml");
  revalidatePath("/llms.txt");
}

/**
 * Internal endpoint for a separately authenticated publication worker only.
 * It deliberately does not fetch a supplied URL or derive revalidation paths
 * from the payload. Repeated deliveries are safe; durable deduplication is a
 * worker responsibility.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = getConfiguredSecret();
  if (!secret) return jsonError(503, "Publication revalidation is unavailable");
  if (!hasValidBearerToken(request.headers.get("authorization"), secret)) {
    return jsonError(401, "Unauthorized");
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return jsonError(415, "Expected application/json");

  const rawBody = await readBodyWithinLimit(request);
  if (rawBody === null) return jsonError(413, "Payload too large");

  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    return jsonError(400, "Invalid publication event");
  }
  if (!parsePublicationEvent(value)) return jsonError(400, "Invalid publication event");

  invalidatePublishedBlogCache();
  return NextResponse.json({ accepted: true, publicReady: false });
}
