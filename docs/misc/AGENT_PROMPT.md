# Visual Mathematics Lab - Repository Bootstrap Prompt

You are an expert software architect, frontend engineer, educational product designer, and DevOps engineer.

Create a production-ready GitHub Pages repository called:

    visual-math-lab

The repository will host a growing collection of interactive mathematics visualisations.

## Business Goals

The project should support:

- Interactive mathematical visualisations
- YouTube traffic acquisition
- Google Analytics
- Buy Me a Coffee support links
- Email newsletter growth
- SEO
- Future premium memberships
- Future teacher resources
- Future school licensing

The first visualisation is:

    Thales' Theorem

The architecture must support 100+ visualisations without restructuring.

---

# Technology Stack

Use:

- HTML5
- CSS3
- Vanilla JavaScript
- GitHub Pages compatible
- Mobile first responsive design
- No backend required
- No frameworks unless absolutely necessary

Repository must be deployable directly via GitHub Pages.

---

# Video Architecture

Do NOT host video files inside the repository.

Do NOT use GitHub Pages as a video hosting platform.

All educational video content must be hosted on YouTube and embedded into the website.

Remove any requirement for:

    assets/videos/

No local video files should exist in the MVP.

---

# YouTube Integration

Each visualisation must support an optional YouTube video embed.

Extend visual metadata structure:

```json
[
  {
    "title": "Thales' Theorem",
    "slug": "thales-theorem",
    "category": "Geometry",
    "description": "Interactive proof and exploration.",
    "thumbnail": "/assets/images/thales-thumbnail.png",
    "youtubeId": "VIDEO_ID_HERE"
  }
]
```

The system should automatically generate an embedded video when a valid YouTube ID exists.

If no YouTube ID is supplied the video section should not render.

---

# Starter Repository Structure

Generate the following MVP-ready structure:

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
│   ├── images/
│   └── icons/
├── css/
├── js/
├── config/
│   └── site-config.js
├── data/
│   └── visuals.json
├── components/
├── visuals/
│   └── thales-theorem/
├── docs/
│   └── roadmap.md
└── .github/workflows/deploy.yml
```

---

# Site Configuration

Generate:

    config/site-config.js

Use it as a central configuration source.

```javascript
const SITE_CONFIG = {
  siteName: "Visual Mathematics Lab",
  buyMeACoffeeUrl: "https://buymeacoffee.com/YOUR_HANDLE",
  membershipUrl: "https://buymeacoffee.com/YOUR_HANDLE/membership",
  analyticsId: "G-XXXXXXXXXX",
  youtubeChannelUrl: "https://youtube.com/@YOUR_CHANNEL"
};
```

No duplicated external URLs may exist elsewhere in the codebase.

---

# Visual Catalogue Architecture

Generate:

    data/visuals.json

```json
[
  {
    "title": "Thales' Theorem",
    "slug": "thales-theorem",
    "category": "Geometry",
    "description": "Interactive proof and exploration.",
    "thumbnail": "/assets/images/thales-thumbnail.png",
    "youtubeId": ""
  }
]
```

Generate dynamic catalogue rendering from visuals.json.

Adding a new visual should require only:

1. Creating a visual folder
2. Adding a visuals.json entry

Nothing else.

---

# Homepage Requirements

Create a fully responsive homepage.

Sections:

1. Hero
2. Featured Visualisations
3. Benefits
4. Support Project
5. Email Newsletter
6. Footer

Hero section must contain:

- Project title
- Project description
- Explore Visuals button
- Buy Me a Coffee button

---

# Analytics Requirements

Create analytics support for:

- visual_view
- support_click
- newsletter_signup
- youtube_click

Automatically derive the visual name from the URL.

---

# Buy Me a Coffee Requirements

Create reusable support buttons.

Support buttons must appear on:

- Homepage
- Footer
- Every visual page

---

# Thales Theorem Starter Page

Generate:

    visuals/thales-theorem/index.html

Page sections:

1. Navbar
2. Title
3. Theorem Description
4. Interactive Canvas Placeholder
5. Optional YouTube Embed
6. Support Project CTA
7. Footer

Do not implement the theorem.

Only build the page structure.

---

# Roadmap

Generate:

    docs/roadmap.md

Roadmap should include future ideas for Geometry, Trigonometry, Calculus and Algebra.

---

# Roadmap Visibility Rules

The roadmap is an internal planning document only.

Requirements:

- docs/roadmap.md must exist.
- The roadmap must NOT be linked from the site.
- The roadmap must NOT appear in navigation.
- The roadmap must NOT appear on the homepage.
- The roadmap must NOT appear in footer links.
- No future visualisations should appear publicly until implemented.
- No Coming Soon cards.
- No placeholder content.

The homepage must render only visualisations that exist in:

    data/visuals.json

Principle:

    Show implemented content only.

---

# Lean MVP Principle

Prioritise one outstanding visualisation over many placeholders.

The initial public release should optimise for:

- User engagement
- Fast loading
- Professional appearance
- YouTube conversion
- Buy Me a Coffee conversion

Generate only pages and assets required for the first published visualisation.

---

# Deliverables

Provide:

1. Full repository tree
2. All starter files
3. Complete code
4. Architectural rationale
5. GitHub Pages deployment instructions

The output must be immediately usable as a GitHub repository.
