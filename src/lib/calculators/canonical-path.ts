/** Canonical public URL for a calculator. Keep category/slug routing in one place. */
export function getCanonicalCalculatorPath(
  calculator: Pick<{ categorySlug: string; slug: string }, "categorySlug" | "slug">,
): string {
  return `/kalkulyatory/${calculator.categorySlug}/${calculator.slug}/`;
}

/** A valid calculator reached under another category must redirect to this URL. */
export function getCalculatorCategoryRedirect(
  requestedCategory: string,
  calculator: Pick<{ categorySlug: string; slug: string }, "categorySlug" | "slug">,
): string | null {
  return requestedCategory === calculator.categorySlug
    ? null
    : getCanonicalCalculatorPath(calculator);
}
