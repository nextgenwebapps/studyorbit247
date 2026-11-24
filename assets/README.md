# StudyOrbit247 assets

Shared, root-level static assets for the StudyOrbit247 website.

## Structure

- `css/` — shared design tokens. Page-specific CSS remains with each page until it is migrated deliberately.

## Brand direction

Use the name **StudyOrbit247** as the only brand signature. Keep the visual theme consistent across pages: black and ivory foundations with restrained gold and ruby-red accents. Do not add a separate square brand icon, badge, or emblem.

## Use

From the repository root:

```html
<link rel="stylesheet" href="assets/css/tokens.css">
```

From a first-level page folder such as `user/` or `mocktest/`, prefix paths with `../`.

Do not add generated, duplicate, unlicensed, or unused assets. Optimize raster images before committing them.
