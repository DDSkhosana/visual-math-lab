# Visual Mathematics Lab
## Enterprise Repository Bootstrap Specification

Version: 1.0

---

# 1. Executive Summary

Create a production-grade GitHub Pages repository called:

    visual-math-lab

The repository hosts a growing collection of interactive mathematical visualisations.

The first visualisation is:

    Thales' Theorem

The architecture must scale to 100+ visualisations without restructuring.

---

# 2. Product Vision

Create a digital mathematics gallery.

Not:
- LMS
- online course platform
- educational dashboard
- SaaS application

Instead:
- mathematical museum
- visual proof collection
- interactive mathematics gallery
- curated educational experience

The visualisations themselves are the product.

---

# 3. Primary Funnel

YouTube
↓
Interactive Visualisation
↓
Support Project
↓
Buy Me a Coffee

---

# Homepage Experience Specification (Authoritative)

The homepage should resemble:
- a curated digital mathematics gallery
- a modern editorial experience
- a mathematical museum installation

References:
- Linear
- Notion
- Framer
- Apple
- Vercel

## Dynamic Hero Mosaic

The homepage hero is a responsive masonry wall generated from:

    data/visuals.json

Every visual contributes:
- thumbnail
- title
- category
- URL

The visualisations themselves become the brand.

## Typography

Preferred:
- Inter
- Geist
- IBM Plex Sans

## Colour System

Background:

    #FCFCFB

Primary text:

    #111111

Secondary text:

    #666666

## Motion

Subtle only:
- gentle drift
- hover fade
- slight scale

Avoid attention-seeking animations.

---

# Repository Structure

```text
visual-math-lab/
├── README.md
├── index.html
├── about.html
├── contact.html
├── privacy.html
├── robots.txt
├── sitemap.xml
├── assets/
├── css/
├── js/
├── config/
├── data/
├── components/
├── visuals/
├── docs/
└── .github/workflows/
```

---

# Site Configuration

```javascript
const SITE_CONFIG = {
  siteName: "Visual Mathematics Lab",
  buyMeACoffeeUrl: "https://buymeacoffee.com/YOUR_HANDLE",
  analyticsId: "G-XXXXXXXXXX"
};
```

---

# Visual Metadata

```json
[
  {
    "title":"Thales' Theorem",
    "slug":"thales-theorem",
    "category":"Geometry",
    "thumbnail":"/assets/images/thales-thumbnail.png",
    "youtubeId":""
  }
]
```

---

# YouTube Architecture

Use YouTube embeds only.
Do not host videos locally.

---

# Buy Me a Coffee

Support buttons must appear on:
- Homepage
- Footer
- Every visual page

---

# Analytics

Events:
- visual_view
- support_click
- newsletter_signup
- youtube_click

---

# GitHub Actions

Generate:
- deploy.yml
- validate.yml
- sitemap.yml

---

# Roadmap Visibility Rules

Roadmap is internal only.
Do not expose it on the live website.

---

# MVP Rule

Show implemented content only.
No Coming Soon cards.
No placeholders.

---

# Deliverables

1. Full repository tree
2. Starter files
3. Full code
4. Documentation
5. Deployment instructions
