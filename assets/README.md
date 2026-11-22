# StudyOrbit247 assets

Shared, root-level static assets for the StudyOrbit247 website.

## Structure

- `brand/` — brand logo, compact mark and browser favicon (SVG).
- `css/` — shared design tokens. Page-specific CSS remains with each page until it is migrated deliberately.
- `images/` — reserved for optimized content images (WebP/AVIF preferred).
- `fonts/` — reserved for licensed self-hosted font files. The current site uses the system font stack, so no font download is required.

## Current brand direction

Black / ivory with gold and ruby accents. Keep logo artwork as SVG for crisp rendering at all sizes.

## Use

From the repository root:

```html
<link rel="icon" type="image/svg+xml" href="assets/brand/favicon.svg">
<link rel="stylesheet" href="assets/css/tokens.css">
```

From a first-level page folder such as `user/` or `mocktest/`, prefix paths with `../`.

Do not add generated, duplicate, unlicensed, or unused assets. Optimize raster images before committing them.
