import { SITE_NAME } from "@/lib/site";

export function withSiteMetaTitle(baseTitle: string): string {
  return `${baseTitle} — ${SITE_NAME}`;
}
