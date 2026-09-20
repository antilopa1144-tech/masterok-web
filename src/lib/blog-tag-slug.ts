const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Канонический ASCII-slug тега. Модуль не зависит от Node API и безопасен для Edge middleware. */
export function tagToSlug(tag: string): string {
  const transliterated = tag
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tag";
}

function preferTagLabel(current: string, candidate: string): string {
  const currentIsLower = current === current.toLocaleLowerCase("ru");
  const candidateIsLower = candidate === candidate.toLocaleLowerCase("ru");
  if (candidateIsLower !== currentIsLower) return candidateIsLower ? candidate : current;
  return candidate.localeCompare(current, "ru") < 0 ? candidate : current;
}

/** Убирает варианты одного тега, отличающиеся регистром или написанием того же slug. */
export function dedupeBlogTags(tags: Iterable<string>): string[] {
  const bySlug = new Map<string, string>();
  for (const rawTag of tags) {
    const tag = rawTag.trim();
    if (!tag) continue;
    const slug = tagToSlug(tag);
    const current = bySlug.get(slug);
    bySlug.set(slug, current ? preferTagLabel(current, tag) : tag);
  }
  return Array.from(bySlug.values()).sort((a, b) => a.localeCompare(b, "ru"));
}

export function isSameBlogTag(left: string, right: string): boolean {
  return tagToSlug(left) === tagToSlug(right);
}
