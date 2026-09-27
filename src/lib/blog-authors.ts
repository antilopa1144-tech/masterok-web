import { SITE_NAME, SITE_URL } from "./site";

export interface BlogAuthor {
  slug: string;
  name: string;
  url?: string;
  role?: string;
}

// Public identity confirmed by the editor; the slug is his existing Ghost account.
export const CHIEF_EDITOR: BlogAuthor = {
  slug: "mikhail",
  name: "Михаил Щегольков",
  role: `главный редактор строительного портала «${SITE_NAME}»`,
  url: `${SITE_URL}/o-proekte/#redaktsiya`,
};

export function blogAuthorsFromGhost(
  authors: Array<{ slug: string; name: string }> = [],
): BlogAuthor[] {
  return authors
    .filter((author) => author.slug && author.name?.trim())
    .map((author) => author.slug === CHIEF_EDITOR.slug
      ? { ...CHIEF_EDITOR }
      : { slug: author.slug, name: author.name.trim() });
}
