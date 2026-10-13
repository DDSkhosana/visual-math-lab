visual-math-lab/
│
├── index.html
├── about.html
├── styles/
│   ├── main.css
│   └── components.css
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── videos/
│
├── visuals/
│   │
│   ├── thales/
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   │
│   ├── pythagoras/
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   │
│   ├── similar-triangles/
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   │
│   └── trigonometry/
│       ├── index.html
│       ├── script.js
│       └── style.css
│
├── blog/
├── privacy-policy.html
└── contact.html

Don't duplicate code.

Instead of:

Plain Text
thales.css
pythagoras.css
similar.css

having thousands of repeated lines, create:

Plain Text
styles/main.css

used by every visual.

Similarly:

Plain Text
scripts/
│
├── analytics.js
├── navigation.js
├── donations.js
└── ui.js

Then each theorem only contains its mathematical logic.

Buy Me a Coffee Structure

Add the same button everywhere.

Plain Text

visual-math-lab/
│
├── README.md
├── index.html                    # Homepage
├── about.html
├── contact.html
├── privacy.html
│
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   ├── thales-thumbnail.png
│   │   └── pythagoras-thumbnail.png
│   │
│   ├── icons/
│   └── videos/
│
├── css/
│   ├── main.css                  # Global styles
│   ├── layout.css
│   ├── cards.css
│   └── visual.css
│
├── js/
│   ├── main.js                   # Navigation etc.
│   ├── analytics.js
│   ├── donate.js
│   └── utils.js
│
├── data/
│   └── visuals.json              # Visual catalogue
│
├── visuals/
│   │
│   ├── thales-theorem/
│   │   ├── index.html
│   │   ├── script.js
│   │   ├── style.css
│   │   └── assets/
│   │       └── thumbnail.png
│   │
│   ├── pythagorean-theorem/
│   │   ├── index.html
│   │   ├── script.js
│   │   ├── style.css
│   │   └── assets/
│   │
│   ├── similar-triangles/
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   │
│   └── trigonometry/
│       ├── index.html
│       ├── script.js
│       └── style.css
│
├── blog/
│   ├── index.html
│   └── posts/
│
└── docs/
    └── roadmap.md

Create one shared file:

js/analytics.js

JavaScript
window.dataLayer = window.dataLayer || [];
 
function gtag(){
dataLayer.push(arguments);
}
 
gtag('js', new Date());
 
gtag('config', 'G-XXXXXXXXXX');

Load it in every page.

visual-math-lab/
│
├── index.html
├── css/
│   └── main.css
├── js/
│   ├── main.js
│   └── analytics.js
│
└── visuals/
    └── thales-theorem/
        ├── index.html
        ├── script.js
        └── style.css

visuals.json
      ↓
Homepage generated automatically
      ↓
Visual pages generated automatically
      ↓
GitHub Pages deploys automatically

[
  {
    "title": "Thales' Theorem",
    "slug": "thales-theorem",
    "description": "Interactive proof of Thales' theorem.",
    "thumbnail": "/assets/thales.png",
    "category": "Geometry"
  },
  {
    "title": "Pythagorean Theorem",
    "slug": "pythagorean-theorem",
    "description": "Visual exploration of Pythagoras.",
    "thumbnail": "/assets/pythagoras.png",
    "category": "Geometry"
  }
]

fetch('/data/visuals.json')
  .then(r => r.json())
  .then(visuals => {
      renderCards(visuals);
  });

visuals/
│
├── thales-theorem/
│
│   ├── meta.json
│   ├── thumbnail.png
│   └── index.html

{
  "title": "Thales' Theorem",
  "description": "Why is the angle always 90°?",
  "youtube": "abc123",
  "difficulty": "Beginner"
}

const visualName =
  window.location.pathname.split('/').pop();

gtag('event', 'visual_view', {
  visual: visualName
});

{
   "title":"Thales' Theorem",
   "video":"dQw4w9WgXcQ"
}

Interactive Visual

Watch Demonstration

Support Project

Visual Mathematics Lab - Repository Bootstrap Prompt
You are an expert software architect, frontend engineer, educational product designer, and DevOps engineer.

Create a production-ready GitHub Pages repository called:

visual-math-lab
The repository will host a growing collection of interactive mathematics visualisations.

Business Goals
The project should support:

Interactive mathematical visualisations
YouTube traffic acquisition
Google Analytics
Buy Me a Coffee support links
Email newsletter growth
SEO
Future premium memberships
Future teacher resources
Future school licensing
The first visualisation is:

Thales' Theorem
The architecture must support 100+ visualisations without restructuring.

Technology Stack
Use:

HTML5
CSS3
Vanilla JavaScript
GitHub Pages compatible
Mobile first responsive design
No backend required
No frameworks unless absolutely necessary
Repository must be deployable directly via GitHub Pages.

Repository Structure
Generate the following structure:

visual-math-lab/ │ ├── README.md ├── index.html ├── about.html ├── contact.html ├── privacy.html │ ├── assets/ │ ├── images/ │ ├── icons/ │ └── videos/ │ ├── css/ │ ├── main.css │ ├── layout.css │ ├── cards.css │ └── visual.css │ ├── js/ │ ├── main.js │ ├── analytics.js │ ├── donate.js │ └── utils.js │ ├── data/ │ └── visuals.json │ ├── visuals/ │ └── thales-theorem/ │ ├── index.html │ ├── script.js │ ├── style.css │ └── assets/ │ ├── docs/ │ └── roadmap.md │ └── .github/ └── workflows/ └── deploy.yml

Visual Catalogue Automation
Do NOT hardcode visual cards.

Create a catalogue system.

Store visual metadata in:

data/visuals.json
Example:

[ { "title": "Thales' Theorem", "slug": "thales-theorem", "category": "Geometry", "description": "Interactive proof and exploration.", "thumbnail": "/assets/images/thales.png", "youtube": "" } ]

The homepage should:

Read visuals.json
Generate cards dynamically
Render visual information automatically
Future visualisations should only require:

Creating a folder
Adding an entry to visuals.json
No homepage modifications should be required.

SEO Requirements
Generate:

sitemap.xml
robots.txt
Open Graph metadata
descriptive page titles
meta descriptions
Use URL conventions:

/visuals/thales-theorem/ /visuals/pythagorean-theorem/ /visuals/similar-triangles/

Analytics Requirements
Create analytics abstraction inside:

js/analytics.js
Include support for:

Google Analytics 4
visual_view event
support_click event
newsletter_signup event
Example:

gtag('event', 'visual_view', { visual: 'thales-theorem' });

Visual pages should automatically derive their visual name from the URL.

Buy Me a Coffee Requirements
Create a central configuration file containing:

donation URL
membership URL
Support buttons must be reusable and appear:

Homepage
Footer
Every visual page
No URL duplication throughout the codebase.

Reusable Components
Create a simple component architecture using JavaScript.

Components:

Navbar
Footer
Visual Card
CTA Section
Support Button
Components must be reusable across all pages.

Thales Theorem Starter Page
Generate:

visuals/thales-theorem/index.html

The page should contain:

theorem title
theorem description
placeholder for interactive canvas
support section
YouTube video placeholder
analytics tracking
Do not implement the theorem itself.

Only create the page structure.

Styling Requirements
Create:

modern educational design
professional appearance
accessible colour contrast
responsive layouts
desktop, tablet, and mobile support
CSS variables
reusable utility classes
Documentation
Generate:

README.md

Include:

project overview
local development
GitHub Pages deployment
adding new visualisations
analytics setup
Buy Me a Coffee setup
Roadmap
Generate docs/roadmap.md.

Roadmap should include:

Geometry:

Thales Theorem
Circle Theorems
Similar Triangles
Pythagorean Theorem
Trigonometry:

Unit Circle
Sine Wave Explorer
Calculus:

Derivative Explorer
Integral Visualiser
Algebra:

Function Transformation Explorer
Deliverables
Provide:

Full repository tree
All starter files
Complete code
Explanations of architectural decisions
Instructions for deploying to GitHub Pages
The output should be immediately usable as a GitHub repository.

Roadmap
Generate:

docs/roadmap.md
Roadmap should include future visualisation ideas organised by domain.

Geometry:

Thales Theorem
Circle Theorems
Similar Triangles
Pythagorean Theorem
Trigonometry:

Unit Circle
Sine Wave Explorer
Calculus:

Derivative Explorer
Integral Visualiser
Algebra:

Function Transformation Explorer
Roadmap Visibility Rules
The roadmap is an internal planning document only.

Requirements:

docs/roadmap.md must exist in the repository.
The roadmap must NOT be linked from the website.
The roadmap must NOT appear in navigation.
The roadmap must NOT appear on the homepage.
The roadmap must NOT appear in footer links.
The roadmap must NOT be exposed through any UI elements.
The roadmap must NOT be indexed through site navigation.
The roadmap must only be available through the repository source code.
The live MVP should expose only:

Home
Visualisations
About
Contact
Support Project
Future visualisations must not be displayed until they are implemented.

The homepage should render only visualisations that exist in:

data/visuals.json
No "Coming Soon" cards should be displayed.

No placeholder visualisations should be shown.

No future roadmap items should appear anywhere on the public website.

Principle:

Show implemented content only.
The initial MVP experience should focus entirely on the first released visualisation:

Thales' Theorem
The site should feel complete and intentional rather than a catalogue of unfinished features.

Lean MVP Principle
Prioritise a highly polished experience around a single visualisation over breadth.

The first release should optimise for:

User engagement
Fast loading
Professional appearance
YouTube conversion
Buy Me a Coffee conversion
Do not generate placeholder pages for future content.

Generate only pages and assets required for the first published visualisation.

visual-math-lab/
│
├── README.md
├── index.html
├── about.html
├── contact.html
├── privacy.html
├── robots.txt
├── sitemap.xml
│
├── assets/
│   ├── images/
│   │   ├── logo.svg
│   │   ├── hero-placeholder.jpg
│   │   └── thales-thumbnail.png
│   │
│   ├── icons/
│   │   ├── favicon.ico
│   │   └── coffee.svg
│   │
│   └── videos/
│
├── css/
│   ├── main.css
│   ├── layout.css
│   ├── cards.css
│   └── visual.css
│
├── js/
│   ├── main.js
│   ├── analytics.js
│   ├── donate.js
│   ├── catalog.js
│   └── utils.js
│
├── config/
│   └── site-config.js
│
├── data/
│   └── visuals.json
│
├── components/
│   ├── navbar.html
│   ├── footer.html
│   └── support-button.html
│
├── visuals/
│   └── thales-theorem/
│       ├── index.html
│       ├── script.js
│       ├── style.css
│       └── assets/
│           └── thumbnail.png
│
├── docs/
│   └── roadmap.md
│
└── .github/
    └── workflows/
        └── deploy.yml

index.html
style.css
script.js
assets/

visual-math-lab/
│
├── README.md
├── index.html
├── about.html
├── contact.html
├── privacy.html
├── robots.txt
├── sitemap.xml
│
├── assets/
│   ├── images/
│   │   ├── logo.svg
│   │   ├── hero-placeholder.jpg
│   │   └── thales-thumbnail.png
│   │
│   ├── icons/
│   │   ├── favicon.ico
│   │   └── coffee.svg
│   │
│   └── videos/
│
├── css/
│   ├── main.css
│   ├── layout.css
│   ├── cards.css
│   └── visual.css
│
├── js/
│   ├── main.js
│   ├── analytics.js
│   ├── donate.js
│   ├── catalog.js
│   └── utils.js
│
├── config/
│   └── site-config.js
│
├── data/
│   └── visuals.json
│
├── components/
│   ├── navbar.html
│   ├── footer.html
│   └── support-button.html
│
├── visuals/
│   └── thales-theorem/
│       ├── index.html
│       ├── script.js
│       ├── style.css
│       └── assets/
│           └── thumbnail.png
│
├── docs/
│   └── roadmap.md
│
└── .github/
    └── workflows/
        └── deploy.yml

const SITE_CONFIG = {
    siteName: "Visual Mathematics Lab",

    buyMeACoffee:
        "https://buymeacoffee.com/YOURNAME",

    membership:
        "https://buymeacoffee.com/YOURNAME/membership",

    analyticsId:
        "G-XXXXXXXXXX"
};

[
  {
    "title": "Thales' Theorem",
    "slug": "thales-theorem",
    "category": "Geometry",
    "description": "Interactive proof and exploration.",
    "thumbnail": "/assets/images/thales-thumbnail.png"
  }
]

fetch("/data/visuals.json")
  .then(r => r.json())
  .then(renderVisuals);

  function trackVisualView(name) {
  gtag("event", "visual_view", {
    visual: name
  });
}

function openSupportPage() {
    window.open(
        SITE_CONFIG.buyMeACoffee,
        "_blank"
    );
}

Navbar

Title

Theorem Description

Interactive Canvas Area

YouTube Demo Section

Support Project

Footer

What the Videos Section Could Become
Option 1: YouTube Metadata (Recommended)

Instead of storing videos, store references.

Plain Text
data/
├── visuals.json
└── videos.json

Example:

JSON
[
{
"visual": "thales-theorem",
"youtubeId": "abc123xyz",
"title": "Understanding Thales' Theorem"
}
]

Then automatically render:

HTML
https://www.youtube.com/embed/abc123xyz
</iframe>

on the theorem page.

This is the most scalable approach.

Option 2: Per-Visual Metadata

For example:

JSON
{
"title": "Thales' Theorem",
"slug": "thales-theorem",
"youtube": "abc123xyz"
}

Then the page automatically displays:

Plain Text
Interactive Visual
 
↓
 
Watch Explanation
 
↓
 
Support Project
Option 3: Future Video Library

If your YouTube channel grows:

Plain Text
Videos
├── Geometry
├── Trigonometry
├── Calculus
└── Algebra

Example homepage section:

Plain Text
Latest Videos
 
▶ Understanding Thales' Theorem
▶ Why Pythagoras Works
▶ Similar Triangles Explained

Each card links to YouTube.

My Recommendation

For your repo, replace:

Plain Text
assets/
└── videos/

with:

Plain Text
data/
├── visuals.json
└── videos.json

or simply extend visuals.json:

JSON
[
{
"title": "Thales' Theorem",
"slug": "thales-theorem",
"description": "Interactive proof.",
"youtubeId": "abc123xyz",
"thumbnail": "/assets/images/thales-thumbnail.png"
}
]

Then every visual automatically gets:

Interactive app
YouTube video embed
Buy Me a Coffee button
Analytics tracking

from a single metadata entry.

That's much cleaner than maintaining a separate videos folder, and it aligns perfectly with your funnel:

Plain Text
YouTube Video
↓
Interactive Visual
↓
Support Project

Video Architecture
Do NOT host video files inside the repository.

Do NOT use GitHub Pages as a video hosting platform.

All educational video content must be hosted on YouTube and embedded into the website.

Remove any requirement for:

assets/videos/
No local video files should exist in the MVP.

YouTube Integration
Each visualisation must support an optional YouTube video embed.

Extend visual metadata structure:

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
The system should automatically generate an embedded video when a valid YouTube ID exists.

Example:

https://www.youtube.com/embed/VIDEO_ID
</iframe>
If no YouTube ID is supplied the video section should not render.

YouTube Funnel
The architecture should support the following funnel:

YouTube Video ↓ Interactive Visualisation ↓ Support Project ↓ Buy Me a Coffee

The website should encourage users to:

Watch videos on YouTube
Explore the interactive visualisation
Support the project
Starter Repository Structure
Generate the following MVP-ready structure:

visual-math-lab/ │ ├── README.md ├── index.html ├── about.html ├── contact.html ├── privacy.html ├── robots.txt ├── sitemap.xml │ ├── assets/ │ ├── images/ │ │ ├── logo.svg │ │ ├── hero-placeholder.jpg │ │ └── thales-thumbnail.png │ │ │ └── icons/ │ ├── favicon.ico │ └── coffee.svg │ ├── css/ │ ├── main.css │ ├── layout.css │ ├── cards.css │ └── visual.css │ ├── js/ │ ├── main.js │ ├── analytics.js │ ├── donate.js │ ├── catalog.js │ └── utils.js │ ├── config/ │ └── site-config.js │ ├── data/ │ └── visuals.json │ ├── components/ │ ├── navbar.html │ ├── footer.html │ └── support-button.html │ ├── visuals/ │ └── thales-theorem/ │ ├── index.html │ ├── style.css │ ├── script.js │ └── assets/ │ └── thumbnail.png │ ├── docs/ │ └── roadmap.md │ └── .github/ └── workflows/ └── deploy.yml

Site Configuration
Generate:

config/site-config.js

Use it as a central configuration source.

Example:

const SITE_CONFIG = {
  siteName: "Visual Mathematics Lab",

  buyMeACoffeeUrl:
    "https://buymeacoffee.com/YOUR_HANDLE",

  membershipUrl:
    "https://buymeacoffee.com/YOUR_HANDLE/membership",

  analyticsId:
    "G-XXXXXXXXXX",

  youtubeChannelUrl:
    "https://youtube.com/@YOUR_CHANNEL"
};
All support links and external URLs must reference this configuration.

No duplicated external URLs may exist elsewhere in the codebase.

Visual Catalogue Architecture
Generate:

data/visuals.json

Example:

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
Generate:

js/catalog.js

Requirements:

Load visuals.json
Render all visual cards dynamically
Generate visual URLs automatically
Support future visualisations without homepage edits
Adding a new visual should require only:

Creating a visual folder
Adding a visuals.json entry
Nothing else.

Thales Theorem Starter Page
Generate:

visuals/thales-theorem/index.html

Page sections:

Navbar
Title
Theorem Description
Interactive Canvas Placeholder
Optional YouTube Embed
Support Project CTA
Footer
The page must automatically:

Detect its visual slug
Track analytics
Render support button
Render YouTube embed when available
Do not implement the theorem.

Only build the page structure.

Analytics Requirements
Create:

js/analytics.js

Required events:

visual_view
support_click
newsletter_signup
youtube_click
Automatically derive visual name from URL.

Example:

gtag('event', 'visual_view', {
  visual: 'thales-theorem'
});
MVP Visibility Rules
The public MVP must contain only content that exists.

Show:

Home
Visualisations
About
Contact
Support Project
Hide:

Roadmap
Future visualisations
Placeholder content
Coming Soon cards
Premium sections
The homepage must render only visualisations present in:

data/visuals.json
Principle:

One excellent visualisation is better than ten placeholders.

GitHub Actions is GitHub's built-in automation system.

Think of it as:

Plain Text
You push code to GitHub
↓
GitHub automatically runs tasks
↓
Website updates itself

Without you doing anything manually.

For your project

Suppose you update your Thales theorem visual:

Shell
git add .
git commit -m "Improved drag behaviour"
git push

GitHub Actions can automatically:

Plain Text
✓ Run tests
✓ Validate links
✓ Build site
✓ Generate sitemap
✓ Deploy to GitHub Pages

All from that single push.

Example Workflow

You create:

Plain Text
.github/
└── workflows/
└── deploy.yml

Inside:

YAML
name: Deploy
 
on:
push:
branches:
- main
 
jobs:
deploy:
runs-on: ubuntu-latest
 
steps:
- uses: actions/checkout@v4
 
- name: Deploy
run: echo "Deploying site..."

Every push triggers the workflow.

Why it's useful for Visual Math Lab
1. Automatic Deployment

Instead of:

Plain Text
Edit site
↓
Upload files
↓
Deploy manually

you do:

Plain Text
Edit site
↓
git push
↓
Done

GitHub Pages updates automatically.

2. Generate Sitemap

When you add:

Plain Text
visuals/thales-theorem
visuals/pythagorean-theorem

a GitHub Action could automatically regenerate:

Plain Text
sitemap.xml

This helps Google discover your pages.

3. Validate Your Site

Check:

Plain Text
Broken links
Missing images
Invalid metadata

before deployment.

4. Build Statistics

Later you could generate:

Plain Text
Visual count: 12
Geometry visuals: 8
Calculus visuals: 2
Algebra visuals: 2

automatically from your visuals.json.

The workflow I'd use
Plain Text
Push to GitHub
↓
GitHub Actions
↓
Validate JSON
↓
Build catalogue
↓
Generate sitemap
↓
Deploy GitHub Pages
For your MVP

You don't need GitHub Actions immediately.

The simplest version is:

Plain Text
GitHub Repository
↓
GitHub Pages

and that's enough.

Once you have:

several visualisations,
analytics,
YouTube traffic,
recurring updates,

then add GitHub Actions to automate deployment and maintenance.

For your first Thales theorem release, I'd focus on:

Plain Text
1. Interactive visual
2. GitHub Pages
3. Google Analytics
4. Buy Me a Coffee
5. YouTube video

Then introduce GitHub Actions as the first automation upgrade.

GitHub Actions Automation
The repository must include GitHub Actions workflows to automate maintenance, quality checks, and deployment.

Generate:

.github/
└── workflows/
    ├── deploy.yml
    ├── validate.yml
    └── sitemap.yml
Deployment Workflow
Generate:

.github/workflows/deploy.yml
Requirements:

Trigger on push to main
Deploy automatically to GitHub Pages
Use official GitHub Pages Actions
No manual deployment steps required
Deployment should occur after successful validation
Workflow:

Push
 ↓
Validate
 ↓
Build
 ↓
Deploy
 ↓
GitHub Pages
Validation Workflow
Generate:

.github/workflows/validate.yml
Requirements:

Validate:

HTML files exist
visuals.json is valid JSON
required visual metadata fields exist
no duplicate slugs
no broken internal visual links
configuration files load correctly
Failures should block deployment.

Sitemap Generation Workflow
Generate:

.github/workflows/sitemap.yml
Requirements:

Automatically generate sitemap.xml from:

index page
about page
contact page
all visual pages
Do not require manual sitemap updates.

Whenever a visual is added:

Visual folder created
visuals.json updated
Push to GitHub
Sitemap updates automatically
Automatic Visual Discovery
Create automation that scans:

visuals/
and identifies valid visualisation folders.

A valid visualisation contains:

index.html
and a matching entry in:

data/visuals.json
Validation should fail if:

folder exists but JSON entry missing
JSON entry exists but folder missing
This ensures catalogue integrity.

Build Pipeline
The build pipeline must automatically:

load visuals.json
validate visual metadata
build homepage catalogue
build visual index
generate sitemap.xml
deploy to GitHub Pages
Workflow:

Git Push
    ↓
Validate
    ↓
Build Catalogue
    ↓
Generate Sitemap
    ↓
Deploy
Analytics Automation
Automatically initialise analytics on every page.

Requirements:

read Google Analytics ID from site-config.js
initialise GA4
automatically track page visits
automatically track visual views
automatically track support button clicks
automatically track YouTube interactions
No page-specific analytics code duplication.

Future Scalability Requirement
The architecture should support:

100+ visualisations
automated deployment
automated sitemap generation
automated catalogue updates
automated analytics integration
Adding a new visualisation should require only:

Create visual folder
Add visuals.json entry
Commit
Push
Everything else must be automated through GitHub Actions and existing site infrastructure.

Use:

Plain Text
HTML5
CSS3
Vanilla JavaScript
GitHub Pages
GitHub Actions

Requirements:

Mobile first
Fully responsive
Accessible
Lightweight
No backend required
Framework-free unless absolutely necessary
GitHub Pages compatible

Lean MVP Principles

Prioritise quality over quantity.

The first release should optimise for:

User engagement
Fast loading
Professional appearance
YouTube conversion
Support conversion

Do not generate placeholder pages for future content.

Generate only pages and assets required for the first released visualisation.

Principle:

Plain Text
One excellent visualisation is better than ten placeholders.
Repository Structure

Generate:

Plain Text
visual-math-lab/
│
├── README.md
├── index.html
├── about.html
├── contact.html
├── privacy.html
├── robots.txt
├── sitemap.xml
│
├── assets/
│ ├── images/
│ │ ├── logo.svg
│ │ ├── hero-placeholder.jpg
│ │ └── thales-thumbnail.png
│ │
│ └── icons/
│ ├── favicon.ico
│ └── coffee.svg
│
├── css/
│ ├── main.css
│ ├── layout.css
│ ├── cards.css
│ └── visual.css
│
├── js/
│ ├── main.js
│ ├── analytics.js
│ ├── donate.js
│ ├── catalog.js
│ └── utils.js
│
├── config/
│ └── site-config.js
│
├── data/
│ └── visuals.json
│
├── components/
│ ├── navbar.html
│ ├── footer.html
│ └── support-button.html
│
├── visuals/
│ └── thales-theorem/
│ ├── index.html
│ ├── style.css
│ ├── script.js
│ └── assets/
│ └── thumbnail.png
│
├── docs/
│ └── roadmap.md
│
└── .github/
└── workflows/
├── deploy.yml
├── validate.yml
└── sitemap.yml
Site Configuration

Generate:

Plain Text
config/site-config.js

Store all external configuration here.

Example:

JavaScript
const SITE_CONFIG = {
siteName: "Visual Mathematics Lab",
 
buyMeACoffeeUrl:
"https://buymeacoffee.com/YOUR_HANDLE",
 
membershipUrl:
"https://buymeacoffee.com/YOUR_HANDLE/membership",
 
analyticsId:
"G-XXXXXXXXXX",
 
youtubeChannelUrl:
"https://youtube.com/@YOUR_CHANNEL"
};

No hardcoded external URLs elsewhere.

Visual Catalogue System

Do not hardcode visual cards.

Create a dynamic catalogue powered by:

Plain Text
data/visuals.json

Example:

JSON
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

Generate:

Plain Text
js/catalog.js

Requirements:

Load visuals.json
Render visual cards automatically
Generate URLs automatically
Support future visualisations

Adding a future visual must require only:

Plain Text
1. Create visual folder
2. Add visuals.json entry
3. Commit
4. Push

No homepage modifications should be required.

Video Architecture

Do not host video files locally.

Do not use GitHub Pages as a video hosting platform.

Use YouTube embeds only.

If a visual contains:

JSON
{
"youtubeId": "abcd1234"
}

Render:

HTML
https://www.youtube.com/embed/abcd1234
</iframe>

If no YouTube ID exists:

Plain Text
Do not render video section.
YouTube Funnel

Support this workflow:

Plain Text
YouTube Video
↓
Interactive Visualisation
↓
Support Project
↓
Buy Me a Coffee

The platform should encourage users to:

Watch videos
Use visualisations
Support development
Reusable Components

Create reusable components:

Plain Text
Navbar
Footer
Support Button
Visual Card
CTA Section

Reusable across all pages.

Buy Me a Coffee Integration

Support buttons must appear:

Homepage
Footer
Every visual page

All support links must come from:

Plain Text
site-config.js

No duplicated donation URLs.

Google Analytics Requirements

Create:

Plain Text
js/analytics.js

Support:

JavaScript
visual_view
support_click
newsletter_signup
youtube_click

Automatically initialise on all pages.

Read Measurement ID from:

Plain Text
site-config.js

Automatically derive visual names from URL.

Example:

JavaScript
gtag('event', 'visual_view', {
visual: 'thales-theorem'
});
Thales Theorem Starter Page

Generate:

Plain Text
visuals/thales-theorem/index.html

Sections:

Navbar
Theorem Title
Theorem Description
Interactive Canvas Placeholder
Optional YouTube Embed
Support Project CTA
Footer

Do not implement theorem logic.

Only generate page structure.

SEO Requirements

Generate:

Plain Text
robots.txt
sitemap.xml

Include:

Open Graph metadata
Meta descriptions
SEO-friendly URLs
Page titles

Example URLs:

Plain Text
/visuals/thales-theorem/
/visuals/pythagorean-theorem/
/visuals/similar-triangles/
GitHub Actions Automation

Generate:

Plain Text
deploy.yml
validate.yml
sitemap.yml
Deploy Workflow

Trigger:

Plain Text
push → main

Pipeline:

Plain Text
Validate
↓
Build
↓
Deploy
↓
GitHub Pages

Use official GitHub Pages Actions.

Validation Workflow

Validate:

visuals.json
Required metadata
Duplicate slugs
Missing folders
Missing visual entries
Broken internal references

Deployment should fail if validation fails.

Sitemap Workflow

Automatically generate sitemap.xml from:

Home page
About
Contact
Visual pages

No manual sitemap maintenance.

Visual Discovery Automation

Automatically verify:

Plain Text
visuals/

Integrity rules:

A visual folder must contain:

Plain Text
index.html

AND

a matching visuals.json entry.

Validation must fail if:

Plain Text
Folder exists without JSON entry

or

Plain Text
JSON entry exists without folder

Roadmap

Create:

Plain Text
docs/roadmap.md

Include future visualisation ideas:

Geometry:

Thales Theorem
Circle Theorems
Similar Triangles
Pythagorean Theorem

Trigonometry:

Unit Circle
Sine Wave Explorer

Calculus:

Derivative Explorer
Integral Visualiser

Algebra:

Function Transformation Explorer
Roadmap Visibility Rules

Roadmap is internal only.

Requirements:

Must exist in repository
Must not appear in navigation
Must not appear on homepage
Must not appear in footer
Must not appear in UI
Must not appear in public navigation

Accessible only through source code.

MVP Visibility Rules

Public MVP must show only:

Plain Text
Home
Visualisations
About
Contact
Support Project

Must not show:

Plain Text
Roadmap
Future Visualisations
Coming Soon
Placeholder Content
Premium Content

Homepage should display only visuals listed in:

Plain Text
data/visuals.json

and only if implemented.

README Requirements

Include:

Project overview
Local development
GitHub Pages deployment
GitHub Actions automation
Google Analytics setup
Buy Me a Coffee setup
Adding new visualisations
YouTube integration
Repository architecture
Deliverables

Provide:

Full repository tree
Complete starter files
Full code
Documentation
Deployment instructions
Architectural rationale

Output must be immediately usable as a GitHub repository.

01_PROJECT_VISION
02_ARCHITECTURE
03_REPOSITORY_STRUCTURE
04_UI_UX_SYSTEM
05_DESIGN_SYSTEM
06_COMPONENT_LIBRARY
07_HOMEPAGE_SPEC
08_VISUAL_PAGE_SPEC
09_ANALYTICS_SPEC
10_YOUTUBE_SPEC
11_BUY_ME_A_COFFEE_SPEC
12_SEO_SPEC
13_ACCESSIBILITY_SPEC
14_GITHUB_ACTIONS_SPEC
15_VALIDATION_RULES
16_CONTENT_SCHEMA
17_VISUAL_CREATION_WORKFLOW
18_DOCUMENTATION_STANDARDS
19_DEPLOYMENT_PIPELINE
20_SCALE_TO_100_VISUALS

Complete file-by-file implementation requirements
Detailed homepage wireframes
Design system (typography, spacing, colours)
Component contracts
JavaScript architecture
GitHub Actions YAML requirements
Validation script pseudocode
SEO checklist
Accessibility checklist
Analytics event taxonomy
Buy Me a Coffee membership architecture
Newsletter architecture
Visual metadata schemas
Content lifecycle workflows
Release management workflows
Future plugin architecture
Teacher-resource architecture
School-licensing architecture

Executive architecture
Product vision
Information architecture
Design system
Component contracts
Repository standards
GitHub Actions workflows
Analytics taxonomy
SEO specification
Accessibility requirements
Buy Me a Coffee integration
YouTube integration
Visual metadata schemas
Validation rules
Deployment pipeline
Content lifecycle
Contributor workflows
Future premium architecture
Teacher-resource architecture
School-licensing architecture

1. Executive Summary
2. Product Vision
3. Business Goals
4. User Personas
5. Information Architecture
6. Repository Architecture
7. GitHub Standards
8. Design System
9. Accessibility Specification
10. Homepage Specification
11. Visual Page Specification
12. Catalog System
13. Metadata Schemas
14. YouTube Architecture
15. Analytics Architecture
16. Buy Me a Coffee Architecture
17. Newsletter Architecture
18. SEO Architecture
19. Open Graph Standards
20. Component Library
21. JavaScript Modules
22. Validation Rules
23. GitHub Actions
24. Testing Standards
25. Deployment Pipeline
26. Scaling to 100+ Visuals
27. Teacher Resource Layer
28. Membership Layer
29. School Licensing Layer
30. Documentation Standards
31. Contributor Guide
32. Roadmap Governance

.gitignore

and later (if you use Astro/Node)

Plain Text
.npmignore

For the current GitHub Pages + Vanilla JS setup, here's a solid .gitignore:

.ignore
# =========================
# Operating System Files
# =========================
 
.DS_Store
Thumbs.db
desktop.ini
 
# =========================
# IDEs
# =========================
 
.vscode/
.idea/
 
*.swp
*.swo
 
# =========================
# Logs
# =========================
 
*.log
logs/
 
npm-debug.log*
yarn-debug.log*
yarn-error.log*
 
# =========================
# Secrets
# =========================
 
.env
.env.local
.env.development
.env.production
 
# Analytics Keys
config/private-config.js
 
# =========================
# Build Artifacts
# =========================
 
dist/
build/
out/
coverage/
 
# =========================
# Temporary Files
# =========================
 
tmp/
temp/
 
*.tmp
*.bak
 
# =========================
# Node.js
# =========================
 
node_modules/
 
# =========================
# Generated Files
# =========================
 
generated/
.cache/
 
# =========================
# Local Testing
# =========================
 
playwright-report/
test-results/
 
# =========================
# Python (if used for tooling)
# =========================
 
__pycache__/
*.pyc
*.pyo
venv/
.venv/
 
# =========================
# Local Asset Drafts
# =========================
 
drafts/
scratch/
experiments/
 
# =========================
# AI Generated Working Files
# =========================
 
.ai-workspace/
.agent-cache/
What should NOT be ignored

These should always stay in Git:

Plain Text
.github/workflows/
data/visuals.json
robots.txt
sitemap.xml
README.md
docs/roadmap.md
assets/images/
visuals/
Important adjustment for Analytics

Don't put your GA4 ID in .env.

For a static site, this is perfectly fine to commit:

JavaScript
analyticsId: "G-XXXXXXXXXX"

Google Analytics Measurement IDs are public by design.

However, if you later add:

Mailchimp API keys
ConvertKit API keys
Stripe keys

those should go into:

Plain Text
.env

and be ignored.

Future Astro/Node Version

If you later migrate to Astro, add:

.ignore
node_modules/
dist/
.astro/

because those folders are regenerated automatically.

One more file for the repo

I'd also include:

Plain Text
.github/
├── workflows/
│ ├── deploy.yml
│ ├── validate.yml
│ └── sitemap.yml
└── dependabot.yml

dependabot.yml automatically updates dependencies and security patches, which is useful if the project grows beyond pure HTML/JS.

For the Visual Mathematics Lab MVP, the most important exclusions are:

.ignore
node_modules/
.env
.vscode/
.idea/
.DS_Store
dist/
build/

Detailed design system
Homepage wireframes
Component contracts
Full GitHub Actions YAML specs
Validation script specifications
Metadata schemas
Coding standards
Accessibility acceptance criteria
Analytics taxonomy
Contributor workflows
Testing standards
Release management
Teacher-resource architecture
Membership architecture
School-licensing architecture

Even better: "Mathematics Constellation"

For v2, rather than a grid, use a canvas/WebGL scene where thumbnail nodes float and connect like a knowledge graph:

Plain Text
Thales
●
/ \
/ \
●-----●
Similar Circle
 
●
Pythagoras

As you add visualisations, the homepage literally becomes a visual map of the mathematics you've built.

For Visual Mathematics Lab, that's the kind of homepage that people remember and share.

Provide your feedback on BizChat
You said:
this must me a minimalist masonry brick strip of minimal crisp font on a crisp background
Copilot said:

Yes. That's a much stronger aesthetic direction than the "educational catalogue" look.

I'd update the specification away from a card-based hero and towards something closer to:

Plain Text
┌─────────────────────────────────────────┐
│ │
│ [◼] [◼◼] [◼] [◼◼◼] [◼] │
│ │
│ VISUAL MATHEMATICS LAB │
│ │
│ Interactive Mathematical Proofs │
│ │
│ Explore Support │
│ │
│ [◼◼] [◼] [◼◼] [◼] [◼◼◼] │
│ │
└─────────────────────────────────────────┘
Design Language

Keywords

Plain Text
Minimal
Editorial
Architectural
Museum-like
Quiet
Precise
Mathematical

Not:

Plain Text
Playful
Colourful
EdTech
Dashboard
Mosaic Requirements

The mosaic should be:

Masonry

Not:

Plain Text
□ □ □ □
□ □ □ □
□ □ □ □

Instead:

Plain Text
□ □□□ □
□□ □ □□□
□ □□ □

using varying aspect ratios.

Automatic

Derived entirely from:

JSON
visuals.json

Every new visualisation contributes:

Plain Text
thumbnail
title
url

to the mosaic.

No manual homepage updates.

Minimal Motion

Think:

Plain Text
Apple
Linear
Framer
Notion

Not:

Plain Text
Parallax explosions
Floating particles
Particles.js

Animation spec:

Plain Text
Duration: 20-40 seconds
 
Transform:
translateY(2px)
translateX(3px)
 
Ease:
very subtle

Almost imperceptible.

Visitors should feel movement rather than notice movement.

Typography

I'd add explicitly:

Markdown
# Typography System
 
Use:
 
- Inter
or
- Geist
or
- IBM Plex Sans
 
Weights:
 
300
400
500
600
 
Avoid:
 
- decorative fonts
- serif display fonts
- handwritten fonts

Hero title:

Plain Text
VISUAL MATHEMATICS LAB

Uppercase.

High letter spacing.

Small enough to feel refined.

Avoid educational blue overload.

Let the visual thumbnails provide colour.

Hero Structure
Plain Text
Masonry Strip Background
 
↓
 
VISUAL MATHEMATICS LAB
 
Interactive Mathematical Visualisations
 
[ Explore ]
[ Support ]
 
↓
 
Scrolling visual index
Thumbnail Behaviour

Default:

Plain Text
Image only

Hover:

Plain Text
Fade overlay
 
THALES' THEOREM
Geometry
 
Launch →

No permanent labels.

Keeps the homepage clean.

Scalability
1 visual

The single thumbnail occupies a significant portion of the mosaic.

10 visuals

Balanced masonry.

50 visuals

Dense editorial wall.

100+ visuals

Virtualised masonry grid.

Lazy-loaded.

Still smooth.

Prompt Addition

Add this to the enterprise specification:

Markdown
# Homepage Hero Architecture
 
Replace traditional hero cards with a dynamic
minimal masonry mosaic generated from
implemented visualisation thumbnails.
 
Data source:
 
data/visuals.json
 
Requirements:
 
- Responsive masonry layout
- Automatically generated
- No hardcoded thumbnails
- Supports 1–100+ visualisations
- Elegant minimal animation
- Crisp typography
- Clean background
- Editorial aesthetic
 
The mosaic acts as:
 
1. Brand identity
2. Navigation mechanism
 
Hover behaviour:
 
- Reveal visual title
- Reveal category
- Reveal launch action
 
Default state should prioritise imagery.
 
Visual language should feel closer to:
 
- Linear
- Notion
- Apple
- Framer
- Design museums
 
and further from:
 
- traditional LMS platforms
- educational dashboards
- colourful learning portals

That aesthetic would make Visual Mathematics Lab feel less like "a maths website" and more like a curated collection of mathematical experiences. That's exactly the kind of design people remember after seeing a YouTube link.

Homepage Design System (Authoritative)
The homepage must avoid the appearance of a traditional educational website.

Avoid:

LMS aesthetics
dashboard layouts
large marketing cards
colourful educational themes
"coming soon" grids
feature-heavy hero sections
The desired aesthetic is:

minimal
editorial
architectural
museum-like
calm
precise
premium
mathematical
References:

Linear
Notion
Framer
Apple
Design museum websites
Modern editorial portfolios
The homepage should feel like a curated collection of mathematical experiences rather than an educational product catalogue.

Dynamic Hero Mosaic (Primary Homepage Feature)
The homepage hero must be built around a dynamic masonry mosaic generated entirely from implemented visualisation thumbnails.

Data source:

data/visuals.json
Every implemented visualisation contributes:

thumbnail
title
category
URL
No thumbnail may be hardcoded.

The mosaic must update automatically whenever a new visualisation is added.

The homepage must never require manual updates when a new visualisation is published.

Masonry Layout Requirements
Use a responsive masonry-style layout.

Avoid:

□ □ □ □
□ □ □ □
□ □ □ □
Prefer:

□ □□□ □
□□ □ □□□
□ □□ □
Requirements:

varying image aspect ratios
responsive layout
automatic scaling
image lazy loading
support for 1–100+ visualisations
Hero Content Overlay
The masonry mosaic acts as the background visual system.

Overlay content should remain extremely minimal.

Example:

VISUAL MATHEMATICS LAB

Interactive Mathematical Visualisations

[ Explore ] [ Support ]

Requirements:

maximum clarity
minimal text
strong whitespace
centred layout
no promotional clutter
Typography System
Preferred fonts:

Inter
Geist
IBM Plex Sans
Use modern sans-serif typography only.

Avoid:

serif display fonts
decorative typography
handwritten fonts
Recommended weights:

300
400
500
600
Hero title should use:

uppercase
subtle letter spacing
restrained sizing
high contrast
Example:

VISUAL MATHEMATICS LAB

The typography should communicate precision and clarity.

Animation Standards
Motion should be nearly imperceptible.

The user should feel motion rather than consciously notice it.

Acceptable effects:

subtle drift
smooth opacity transitions
gentle hover scaling
minimal parallax
Avoid:

particle systems
animated backgrounds
large transforms
attention-seeking effects
Target animation durations:

20–40 seconds for background drift.

Thumbnail Behaviour
Default state:

image only
no visible labels
clean presentation
Hover state:

Reveal:

title
category
launch action
Example:

THALES' THEOREM

Geometry

Launch →

Transitions must be smooth and minimal.

Mosaic Functionality
The masonry mosaic serves two purposes:

Brand identity
Site navigation
Every thumbnail should be clickable.

Click behaviour:

/visuals/thales-theorem
or equivalent visual URL.

Scaling Behaviour
1 visual:

large focal tile
5 visuals:

balanced masonry composition
20 visuals:

dense editorial presentation
100+ visuals:

virtualised masonry layout
lazy loaded thumbnails
performant rendering
No redesign should be required as the collection grows.

Public Experience Principle
The homepage should communicate:

"Here is a living collection of mathematical ideas."

It should not communicate:

"Here is a software product."

The visualisations themselves are the primary content.

The interface should remain intentionally restrained and unobtrusive.

I would also update the repository prompt so the homepage generator creates this structure:

Plain Text
Hero Mosaic
↓
Minimal Overlay
↓
Visual Index
↓
Support CTA
↓
Footer

and remove most of the traditional marketing sections entirely. For Visual Mathematics Lab, the thumbnails themselves should become the brand.

Homepage Experience Specification (Authoritative)
This specification replaces all previous homepage hero implementations.

The homepage is the most important public-facing asset of the platform.

It should establish the Visual Mathematics Lab identity immediately through its visual language rather than marketing copy.

The homepage must avoid the appearance of:

online education portals
LMS platforms
SaaS dashboards
course marketplaces
traditional landing pages
feature-heavy marketing sites
The homepage should resemble:

a curated digital mathematics gallery
a design-forward knowledge collection
a mathematical museum installation
a modern editorial experience
Visual references:

Linear
Notion
Framer
Apple
Vercel
Design museum websites
Architectural portfolios
Core Homepage Concept
The homepage is built around a living masonry wall of visualisation thumbnails.

The visualisations themselves become the brand.

Every implemented visualisation contributes to the homepage presentation.

The homepage should feel as though it evolves naturally as the visualisation library grows.

Dynamic Hero Mosaic
The hero section must contain a responsive masonry mosaic.

Data source:

data/visuals.json
For every implemented visualisation:

title
slug
category
thumbnail
must be loaded automatically.

No thumbnails may be hardcoded.

New visualisations must automatically appear in the homepage mosaic after:

Creating the visual folder
Updating visuals.json
Pushing to GitHub
No homepage edits should be required.

Masonry Layout Requirements
Use a masonry layout rather than a fixed grid.

Avoid:

□ □ □ □ □ □ □ □ □ □ □ □

Prefer:

□ □□□ □ □□ □ □□□ □ □□ □

Requirements:

varying thumbnail sizes
varying aspect ratios
balanced composition
responsive scaling
mobile-first layout
support for 1–100+ visualisations
The layout should feel organic but mathematically ordered.

Hero Overlay
The masonry wall functions as a contextual background.

Overlay content must remain restrained.

Example:

VISUAL MATHEMATICS LAB

Interactive Mathematical Visualisations

[ Explore ] [ Support ]

Requirements:

centred composition
minimal copy
large whitespace
high readability
no marketing clutter
no feature lists
no excessive CTAs
The mathematics should remain the focus.

Typography System
Preferred fonts:

Inter
Geist
IBM Plex Sans
Typography principles:

clean
crisp
highly legible
minimal personality
premium technical aesthetic
Avoid:

decorative fonts
novelty fonts
script fonts
educational fonts
serif display fonts
Recommended weights:

300
400
500
600
Hero title should use:

uppercase lettering
measured spacing
restrained hierarchy
strong contrast
Example:

VISUAL MATHEMATICS LAB

The typography should communicate precision and clarity.



Motion Design
Motion must be subtle.

The user should feel movement rather than consciously notice it.

Acceptable:

gentle drift
opacity transitions
hover fades
slight hover scaling
subtle parallax
Avoid:

particle systems
floating icons
spinning elements
aggressive motion
distracting animations
Target movement duration:

20–40 seconds

Motion should contribute atmosphere rather than attention.

Thumbnail Behaviour
Default state:

image only
no overlay
no labels
visual focus
Hover state:

Reveal:

title
category
launch action
Example:

THALES' THEOREM

Geometry

Launch →

Transition should be:

smooth
understated
immediate
Mosaic Navigation
The mosaic is both:

Branding
Navigation
Every tile is interactive.

Clicking a tile navigates to:

/visuals/{slug}
Example:

/visuals/thales-theorem
Scaling Behaviour
One visual:

dominant focal thumbnail
Five visuals:

balanced masonry composition
Twenty visuals:

dense editorial wall
One hundred visualisations:

virtualised rendering
lazy-loaded thumbnails
maintained performance
No redesign should be required as the collection grows.

Hero Performance Requirements
Requirements:

lazy load images
compressed thumbnails
responsive image sizes
avoid unnecessary JavaScript
maintain smooth scrolling
optimise for Core Web Vitals
The hero should feel lightweight despite being visually rich.

Content Rules
Do not display:

roadmap items
future plans
"coming soon"
placeholder cards
fake content
The homepage should represent only completed and published visualisations.

The public experience should communicate:

"A living collection of mathematical ideas."

It should never communicate:

"A catalogue of unfinished plans."

Homepage Content Hierarchy
Order:

Dynamic Masonry Hero
Minimal Overlay CTA
Published Visualisation Index
Support Project Section
Footer
Do not introduce additional marketing sections unless explicitly justified.

The visualisations themselves should remain the primary content.

Design Philosophy
The interface should disappear.

The mathematics should remain.

The homepage should feel calm, deliberate, precise, timeless, and worthy of exploration.

Visitors should feel that they are browsing a curated collection of mathematical experiences rather than navigating a conventional educational website.

Replace the existing "Homepage Requirements", "Homepage Design", "Hero Section", and "Homepage UX" sections with the new masonry specification.

In the master prompt structure, it should sit here:

Plain Text
1. Executive Summary
2. Product Vision
3. Business Goals
4. User Personas
5. Information Architecture
6. Repository Architecture
7. GitHub Standards
8. Design System
9. Accessibility Specification
 
10. Homepage Experience Specification ← REPLACE HERE
 
11. Visual Page Specification
12. Catalog System
13. Metadata Schemas
14. YouTube Architecture
15. Analytics Architecture
16. Buy Me a Coffee Architecture
17. Newsletter Architecture
18. SEO Architecture
19. Open Graph Standards
20. Component Library
21. JavaScript Modules
22. Validation Rules
23. GitHub Actions
24. Testing Standards
25. Deployment Pipeline
26. Scaling to 100+ Visuals
27. Teacher Resource Layer
28. Membership Layer
29. School Licensing Layer
30. Documentation Standards
31. Contributor Guide
32. Roadmap Governance

Specifically:

Remove
Markdown
# Homepage Requirements
 
Generate a fully responsive homepage.
 
Sections:
 
1. Hero
2. Featured Visualisations
3. Benefits
4. Support Project
5. Newsletter Signup
6. Footer

and any references to:

Plain Text
Featured Visualisation Cards
Benefits Section
Marketing Sections
Traditional Landing Page Hero
Coming Soon Cards
Replace with
Markdown
# Homepage Experience Specification (Authoritative)
 
[INSERT FULL MASONRY SPEC HERE]
 
Dynamic Hero Mosaic
Typography System
Colour System
Motion Design
Thumbnail Behaviour
Mosaic Navigation
Scaling Behaviour
Hero Performance Requirements
Content Rules
Homepage Content Hierarchy
Design Philosophy
Also update Repository Expectations

The homepage is no longer:

Plain Text
Hero
↓
Feature Cards
↓
Benefits
↓
Newsletter

It becomes:

Plain Text
Dynamic Masonry Mosaic
↓
Minimal Overlay
↓
Published Visualisation Index
↓
Support Project
↓
Footer
Update the agent instructions

Add:

Markdown
The homepage must be generated from visualisation metadata.
 
The visualisation library itself is the hero.
 
Visual thumbnails are the primary design element.
 
Marketing elements should remain secondary.
 
All homepage layouts must derive from data/visuals.json.

This makes the aesthetic a core architectural requirement, not just a styling preference. The agent will then build the site around the evolving visualisation collection rather than around traditional landing-page sections.

Also update the architecture section

Replace any mention of:

Plain Text
Hero
↓
Featured Cards
↓
Benefits
↓
Newsletter
↓
Footer

with:

Plain Text
Dynamic Masonry Mosaic
↓
Minimal Overlay
↓
Published Visualisation Index
↓
Support Project
↓
Footer

Add this rule under Visual Catalogue System
Markdown
# Homepage Generation Rule
 
The homepage hero mosaic must be generated entirely from:
 
data/visuals.json
 
The visualisation library itself is the homepage hero.
 
Visual thumbnails are the primary design element.
 
Marketing content must remain secondary.
 
All homepage rendering should derive from visual metadata.
 
No homepage thumbnail content may be hardcoded.

This should become the authoritative homepage specification throughout AGENT_PROMPT_MASTER.md.

01_EXECUTIVE_SUMMARY
02_PRODUCT_VISION
03_BUSINESS_GOALS
04_USER_PERSONAS
05_INFORMATION_ARCHITECTURE
06_REPOSITORY_ARCHITECTURE

07_VISUAL_IDENTITY_SYSTEM
08_DESIGN_SYSTEM
09_ACCESSIBILITY_STANDARDS

10_HOMEPAGE_EXPERIENCE_SPECIFICATION
   ├─ Dynamic Hero Mosaic
   ├─ Masonry Layout
   ├─ Typography System
   ├─ Colour System
   ├─ Motion Design
   ├─ Thumbnail Behaviour
   ├─ Navigation Behaviour
   ├─ Performance Requirements
   └─ Design Philosophy

11_VISUAL_PAGE_SPECIFICATION
12_VISUAL_METADATA_SCHEMA
13_VISUAL_CATALOGUE_SYSTEM

14_YOUTUBE_ARCHITECTURE
15_GOOGLE_ANALYTICS_ARCHITECTURE
16_BUY_ME_A_COFFEE_ARCHITECTURE
17_NEWSLETTER_ARCHITECTURE

18_SEO_ARCHITECTURE
19_OPEN_GRAPH_ARCHITECTURE

20_COMPONENT_LIBRARY
21_JAVASCRIPT_MODULE_ARCHITECTURE

22_GITHUB_ACTIONS_AUTOMATION
23_VALIDATION_PIPELINE
24_TESTING_STANDARDS

25_DEPLOYMENT_PIPELINE
26_SCALABILITY_TO_100_PLUS_VISUALS

27_TEACHER_RESOURCES_ARCHITECTURE
28_MEMBERSHIP_ARCHITECTURE
29_SCHOOL_LICENSING_ARCHITECTURE

30_DOCUMENTATION_STANDARDS
31_CONTRIBUTOR_WORKFLOW

32_ROADMAP_GOVERNANCE
33_MVP_VISIBILITY_RULES

34_GITIGNORE_REQUIREMENTS

35_DELIVERABLES

Visual Mathematics Lab
Enterprise Repository Bootstrap Specification
Version: 1.0

1. Executive Summary
Create a production-grade GitHub Pages repository called:

visual-math-lab
The repository hosts a growing collection of interactive mathematical visualisations.

The first visualisation is:

Thales' Theorem
The architecture must scale to:

100+ visualisations
YouTube-driven traffic
Analytics-driven optimisation
Community-supported development
Teacher resources
Membership offerings
School licensing
without restructuring.

2. Product Vision
Create a digital mathematics gallery.

Not:

LMS
online course platform
educational dashboard
SaaS application
Instead:

mathematical museum
visual proof collection
interactive mathematics gallery
curated educational experience
The visualisations themselves are the product.

The interface should remain secondary.

3. Primary Funnel
YouTube ↓ Interactive Visualisation ↓ Support Project ↓ Buy Me a Coffee

Secondary Funnel:

Website ↓ Newsletter ↓ Future Releases ↓ Memberships

4. Technology Stack
Use:

HTML5
CSS3
Vanilla JavaScript
GitHub Pages
GitHub Actions
Google Analytics 4
No backend required.

No frameworks unless absolutely justified.

Must deploy directly to GitHub Pages.

5. Lean MVP Principles
Focus on:

one excellent visualisation
very high quality
extremely fast performance
Avoid:

placeholders
fake content
unfinished sections
future promises
Principle:

Show implemented work only.
6. Repository Structure
visual-math-lab/ │ ├── README.md ├── index.html ├── about.html ├── contact.html ├── privacy.html ├── robots.txt ├── sitemap.xml │ ├── assets/ │ ├── images/ │ └── icons/ │ ├── css/ │ ├── main.css │ ├── layout.css │ ├── cards.css │ └── visual.css │ ├── js/ │ ├── main.js │ ├── analytics.js │ ├── donate.js │ ├── catalog.js │ └── utils.js │ ├── config/ │ └── site-config.js │ ├── data/ │ └── visuals.json │ ├── components/ │ ├── navbar.html │ ├── footer.html │ └── support-button.html │ ├── visuals/ │ └── thales-theorem/ │ ├── index.html │ ├── script.js │ ├── style.css │ └── assets/ │ ├── docs/ │ └── roadmap.md │ └── .github/ └── workflows/ ├── deploy.yml ├── validate.yml └── sitemap.yml

7. Site Configuration
Generate:

config/site-config.js

Example:

const SITE_CONFIG = {
  siteName: "Visual Mathematics Lab",

  buyMeACoffeeUrl:
    "https://buymeacoffee.com/YOUR_HANDLE",

  membershipUrl:
    "https://buymeacoffee.com/YOUR_HANDLE/membership",

  analyticsId:
    "G-XXXXXXXXXX",

  youtubeChannelUrl:
    "https://youtube.com/@YOUR_CHANNEL"
};
No duplicate configuration values elsewhere.

8. Visual Metadata Schema
Create:

data/visuals.json

Example:

[
  {
    "title":"Thales' Theorem",
    "slug":"thales-theorem",
    "category":"Geometry",
    "description":"Interactive proof and exploration.",
    "thumbnail":"/assets/images/thales-thumbnail.png",
    "youtubeId":""
  }
]
Every published visualisation must exist here.

9. Dynamic Catalogue Architecture
Generate:

js/catalog.js

Requirements:

load visuals.json
generate visual cards
generate mosaic content
generate visual links
support future visuals automatically
Adding a visual requires only:

Create folder
Add metadata entry
Push to GitHub
No homepage edits.

10. Homepage Experience Specification (Authoritative)
This supersedes all hero specifications.

The website homepage must not resemble:

educational portal
LMS
dashboard
SaaS homepage
The homepage should resemble:

museum website
editorial collection
curated visual archive
References:

Linear
Notion
Framer
Apple
Vercel
11. Dynamic Hero Mosaic
The homepage hero is a masonry wall.

Data source:

data/visuals.json
Every visual contributes:

thumbnail
title
category
URL
Automatically generated.

Never hardcoded.

12. Masonry Layout
Avoid:

□ □ □ □ □ □ □ □ □ □ □ □

Prefer:

□ □□□ □ □□ □ □□□ □ □□ □

Requirements:

responsive
masonry layout
varying aspect ratios
lazy loading
scalable
Support:

1 visual
10 visuals
50 visuals
100 visuals+
without redesign.

13. Hero Overlay
Overlay text:

VISUAL MATHEMATICS LAB

Interactive Mathematical Visualisations

[ Explore ] [ Support ]

Requirements:

minimal
centred
high whitespace
strong readability
Avoid marketing clutter.

14. Typography System
Preferred fonts:

Inter
Geist
IBM Plex Sans
Weights:

300
400
500
600
Avoid:

decorative fonts
handwriting fonts
playful educational fonts
Hero title:

uppercase
letter-spaced
restrained

16. Motion Design
Subtle only.

Acceptable:

drift
opacity transitions
hover fade
minimal hover scale
Avoid:

particles
floating objects
aggressive motion
Target cycles:

20–40 seconds

17. Thumbnail Behaviour
Default:

image only
Hover:

Reveal:

title
category
launch action
Example:

THALES' THEOREM

Geometry

Launch →

Clickable.

18. Homepage Hierarchy
Dynamic Masonry Mosaic
Minimal Overlay
Published Visualisation Index
Support Project Section
Footer
19. Visual Page Specification
Generate:

visuals/thales-theorem/index.html

Sections:

Navbar
Title
Description
Interactive Canvas Placeholder
YouTube Embed
Support CTA
Footer
Do not implement theorem logic.

Only structure.

20. YouTube Architecture
Do not host videos locally.

All videos remain on YouTube.

Each visual may contain:

{
  "youtubeId":"abc123"
}
Render:

https://www.youtube.com/embed/abc123
</iframe>
If missing:

Hide video section.

21. Buy Me a Coffee Integration
Support buttons appear on:

homepage
footer
every visual page
Read URLs only from:

site-config.js

No duplicated URLs.

22. Analytics Architecture
Generate:

js/analytics.js

Events:

visual_view
support_click
newsletter_signup
youtube_click
Example:

gtag('event', 'visual_view', {
  visual: 'thales-theorem'
});
Automatically determine visual names from URLs.

23. Newsletter Architecture
Allow future newsletter integration.

Placeholder support only.

No hard dependency required for MVP.

24. SEO Requirements
Generate:

robots.txt
sitemap.xml
Provide:

Open Graph tags
meta descriptions
descriptive titles
Visual URLs:

/visuals/thales-theorem/ /visuals/pythagorean-theorem/

25. Accessibility Standards
Target WCAG 2.1 AA.

Requirements:

keyboard navigation
visible focus states
semantic HTML
image alt text
colour contrast compliance
26. Component System
Create reusable components:

Navbar
Footer
Support Button
Visual Card
CTA Section
Reusable across all pages.

27. GitHub Actions
Generate:

deploy.yml validate.yml sitemap.yml

Deploy Workflow
Push ↓ Validate ↓ Build ↓ Deploy ↓ GitHub Pages

Validation Workflow
Validate:

visuals.json
duplicate slugs
missing folders
missing metadata
internal links
Failures block deployment.

Sitemap Workflow
Automatically generate sitemap.xml.

No manual updates.

28. Visual Discovery Automation
Validation rules:

Every folder:

visuals/{slug}/

must have:

index.html

AND

matching visuals.json entry.

Validation fails otherwise.

29. Scaling Requirements
Architecture must support:

100+ visualisations
teacher resources
memberships
school licensing
newsletter growth
without major refactoring.

30. Roadmap
Generate:

docs/roadmap.md

Future ideas:

Geometry:

Thales Theorem
Circle Theorems
Similar Triangles
Pythagorean Theorem
Trigonometry:

Unit Circle
Sine Wave Explorer
Calculus:

Derivative Explorer
Integral Visualiser
Algebra:

Function Transformation Explorer
31. Roadmap Visibility Rules
Roadmap is internal.

Must not appear:

homepage
navigation
footer
visual pages
Only repository source.

32. MVP Visibility Rules
Public site may show:

Home
Visualisations
About
Contact
Support
Do not show:

coming soon
future releases
placeholders
roadmap
Show implemented content only.

33. .gitignore
Include:

.DS_Store
Thumbs.db
.vscode/
.idea/

node_modules/

dist/
build/

.env
.env.local

*.log

__pycache__/
*.pyc

coverage/

tmp/
temp/

drafts/
scratch/
34. README Requirements
Include:

project overview
local development
visual creation workflow
GitHub Pages deployment
GitHub Actions automation
Analytics Setup
Buy Me a Coffee Setup
YouTube integration
repository architecture
35. Deliverables
Provide:

Full repository tree
All starter files
Complete source code
Documentation
GitHub Actions workflows
Deployment instructions
Architectural rationale
Output must be immediately usable as a GitHub repository.

