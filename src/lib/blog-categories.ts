/** UI labels only: never rewrite Ghost tags, article URLs or category metadata. */
export function blogCategoryLabel(category: string): string {
  const key = category.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
  if (!key) return "Без категории";
  if (key === "инженерия" || key === "инженерные системы") return "Инженерные системы";
  return key.charAt(0).toLocaleUpperCase("ru-RU") + key.slice(1);
}

export function getBlogCategories(posts: ReadonlyArray<{ category: string }>) {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const label = blogCategoryLabel(post.category);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b, "ru-RU")).map(([label, count]) => ({ label, count }));
}
