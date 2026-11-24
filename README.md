# StudyOrbit247 assets

Shared visual guidelines for the StudyOrbit247 website.

## Structure

- `react-app/src/styles/tokens.css` holds shared design tokens. Page-specific styles live alongside their React pages.

## Brand direction

Use the name **StudyOrbit247** as the only brand signature. Keep the visual theme consistent across pages: black and ivory foundations with restrained gold and ruby-red accents. Do not add a separate square brand icon, badge, or emblem.

## Use

From the repository root:

```html
<link rel="stylesheet" href="react-app/src/styles/tokens.css">
```

From a first-level page folder such as `user/` or `mocktest/`, prefix paths with `../`.

Do not add generated, duplicate, unlicensed, or unused assets. Optimize raster images before committing them.

## Page headers

Use the shared `--so-header-height` token from `react-app/src/styles/tokens.css` for new page headers so they match the homepage on desktop and mobile.
