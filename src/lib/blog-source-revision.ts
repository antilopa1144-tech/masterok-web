import { createHash } from "node:crypto";

/** v1 wire contract shared with ops/publication-worker/worker.py. */
export const BLOG_REVISION_FIELDS = [
  "id", "slug", "title", "html", "published_at", "updated_at",
  "feature_image", "feature_image_alt", "meta_title", "meta_description",
  "custom_excerpt", "excerpt", "reading_time",
] as const;

type RevisionPost = Partial<Record<(typeof BLOG_REVISION_FIELDS)[number], string | number>> & {
  primary_tag?: { id: string };
  tags?: Array<{ id: string; name: string; slug: string }>;
};

export function blogSourceRevision(post: RevisionPost): string {
  const wire = [
    "ghost-publication-v1",
    ...BLOG_REVISION_FIELDS.map((field) => String(post[field] ?? "")),
    post.primary_tag?.id ?? "",
    (post.tags ?? []).map((tag) => [tag.id, tag.name, tag.slug]),
  ];
  return createHash("sha256").update(JSON.stringify(wire), "utf8").digest("hex");
}
