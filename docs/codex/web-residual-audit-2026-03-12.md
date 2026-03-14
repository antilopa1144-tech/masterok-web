# Web Residual Audit

Date: 2026-03-12
Scope: `C:\masterok-web`

## What is already normalized

- Shared site branding and URL now come from `src/lib/site.ts`.
- Page-level metadata and JSON-LD were aligned across `app/*`.
- Calculator UI text/display config was moved out of scattered JSX into shared modules.
- Footer and Mikhalych page now derive calculator links and labels from the canonical registry.
- Blog related-calculator CTA no longer duplicates calculator labels inside article data.
- Checklist complexity labels no longer live in checklist content data.
- All 60 calculator formulas now build `metaTitle` through `withSiteMetaTitle(...)`.
- All 60 calculator formulas now define visible `faq` content for calculator detail pages.
- Regression coverage exists for calculator index/registry metadata consistency.
- Full `next build` is green after the cleanup.

## Low-risk web debt that is effectively closed

These classes of issues are now at a low enough level that further broad cleanup would likely have low ROI:

- shared site URL / site name drift
- page-level branding literals
- schema naming drift for core tool pages
- registry/display duplicates for popular calculator links
- calculator `metaTitle` brand suffix drift
- calculator FAQ coverage gaps on detail pages

## Remaining debt worth tracking

### 1. Formula `metaDescription` content is now quality-gated, but still intentionally literal

Status:
- `60 / 60` calculator formula files still define `metaDescription` as per-calculator literal text.
- The catalog now has regression checks for minimum length, punctuation, brand consistency and explicit user intent.
- Residual scan no longer shows obvious generic-pattern outliers like `онлайн.`, `быстро и точно`, or bare `по площади.` endings.

Reason to keep for now:
- This is still content, not just branding.
- The copy varies materially by calculator, norms, brands, and search intent.
- A bulk abstraction here would still be higher risk than the current benefit.

Recommended future move:
- Treat further work here as a deliberate SEO/content optimization phase, not as generic technical cleanup.
- Prioritize only calculators where search intent, CTR or topical coverage justify another copy pass.

### 2. FAQ coverage is now effectively closed for calculator detail pages

Status:
- Calculator detail pages now render visible FAQ content in addition to `FAQPage` schema.
- `60 / 60` calculator formulas currently define `faq`.
- FAQ coverage now spans the full calculator catalog, including all high-value pages.

Reason to keep for now:
- Missing FAQ coverage is no longer a meaningful residual issue in the calculator catalog.
- Further work here should focus on answer quality, search-intent fit and schema usefulness rather than on adding more entries.

Recommended future move:
- Refine FAQ only where search intent or CTR suggests that richer answers would help.
- Prioritize answer quality, schema alignment and SERP usefulness over adding more entries.

### 3. Field and option labels intentionally remain in calculator definitions

Status:
- Formula files still contain many `label` fields for inputs and select options.

Reason to keep for now:
- On web these labels are part of the calculator definition contract and are rendered directly by UI.
- They are not accidental duplication in the same way as footer links or metadata branding.
- Moving them blindly would be a larger product/localization refactor.

Recommended future move:
- Handle only within a separate “calculator localization/config normalization” phase.

### 4. Repository-level URL literals outside runtime `src`

Status:
- `NEXT_PUBLIC_SITE_URL=https://getmasterok.ru` still exists in env examples and GitHub workflows.

Reason to keep for now:
- Those are deployment/config references, not runtime display debt.
- They are expected and should not be “normalized away” into app runtime code.

Recommended future move:
- Review only when deployment strategy changes.

### 5. Static navigation copy still exists where it is intentional

Status:
- Header/footer/category labels and page hero text still contain literal Russian copy in shared config objects.

Reason to keep for now:
- This is intentional product copy, already centralized enough for the current architecture.
- Further abstraction would mostly add indirection without reducing real risk.

Recommended future move:
- Change only if the project adopts a full localization/i18n system on web.

## Current recommendation

Do not continue broad low-risk cleanup in `masterok-web` blindly.

The next worthwhile web tasks should be one of these explicit phases:

1. SEO/content phase
   - continue only with deliberate CTR/search-intent work: schema content, article copy patterns, FAQ answer quality, and selective high-value `metaDescription` refinements.

2. Calculator definition phase
   - formalize field/option label ownership and decide whether web needs full config-driven localization.

3. Residual bug/risk phase
   - target concrete runtime issues only, not generic branding cleanup.
