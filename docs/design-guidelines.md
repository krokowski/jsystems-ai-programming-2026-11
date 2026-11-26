# Design Guidelines

Brand reference extracted from the Asseco Poland homepage (<https://pl.asseco.com/>) on 2026-11-25. The values are computed styles from the live page in desktop Chrome at 1440×900, after the cookie consent was accepted. The machine-readable source of truth is [`assets/design-tokens.json`](../assets/design-tokens.json). Tokens marked *(proposed)* do not appear on the homepage and were added to complete the system.

> **License notice:** the Geomanist font files and the Asseco logo are third-party brand assets. Verify usage rights before using or redistributing them in the application.

## Assets

| Asset | Path | Notes |
|---|---|---|
| Homepage screenshot | [`../assets/homepage.png`](../assets/homepage.png) | Full page, 1440 px viewport, no overlays. Visual reference for Manual QA. |
| Logo (light, for dark backgrounds) | [`../assets/logo.svg`](../assets/logo.svg) | White wordmark, 132×16 viewBox. Default variant. |
| Logo (dark, for light backgrounds) | [`../assets/logo-dark.svg`](../assets/logo-dark.svg) | Same wordmark in `#01080F`. Derived from `logo.svg`. |
| Favicon | [`../assets/favicon.png`](../assets/favicon.png) | 32×32 PNG. |
| Font, Geomanist 400 | [`../assets/fonts/geomanist/geomanist-regular.ttf`](../assets/fonts/geomanist/geomanist-regular.ttf) | Body text and navigation. |
| Font, Geomanist 700 | [`../assets/fonts/geomanist/geomanist-book.ttf`](../assets/fonts/geomanist/geomanist-book.ttf) | Headings and labels. The site maps the "Book" cut to `font-weight: 700`. |
| Design tokens | [`../assets/design-tokens.json`](../assets/design-tokens.json) | All values below in JSON. |

## Colors

The interface is **dark-first**. Most of the page sits on near-black navy, with indigo gradients and a single bright cyan accent. Light surfaces appear only inside content blocks such as the case-study band and the cards.

### Brand

| Token | Value | Usage |
|---|---|---|
| `brand.primary` | `#252476` | Indigo used in section gradients and overlays |
| `brand.primaryGlow` | `#3E3DC4` | Blurred "glow ball" decorations behind content |
| `brand.accent` | `#00AEE8` | The only saturated UI color: CTA arrow circles, active indicators, beams |
| `brand.accentLight` | `#A9E8FD` | End stop of the accent beam gradient |
| `brand.error` *(proposed)* | `#E5484D` | Validation errors |
| `brand.success` *(proposed)* | `#2EB67D` | Success states |

### Backgrounds

| Token | Value | Usage |
|---|---|---|
| `background.default` | `#01080F` | Page body |
| `background.navy` | `#0F1335` | Section gradient start and end stops |
| `background.navyDeep` | `#0F1442` | Fade overlays at the bottom of media |
| `background.light` | `#F9F9F9` | Light content bands and case-study cards |
| `background.surface` | `#FFFFFF` | Cards and badges |
| `background.glass` | `rgba(255,255,255,0.05)` | Fixed header, used with `backdrop-filter: blur(32px)` |
| `background.glassStrong` | `rgba(255,255,255,0.10)` | Hover and secondary glass panels |

### Text and borders

| Token | Value | Usage |
|---|---|---|
| `text.primary` / `text.onDark` | `#FFFFFF` | Default text on dark sections |
| `text.onLight` | `#000000` | Text on light sections and cards |
| `text.secondary` | `#212121` | Secondary text on light surfaces |
| `text.muted` | `rgba(255,255,255,0.3)` | Inactive tabs, footer meta |
| `border.onDark` | `rgba(255,255,255,0.1)` | Header bottom border, tab and section dividers |
| `border.onLight` | `#F1F1F1` | Badge and card borders on light surfaces |

### Gradients

- **sectionNavy**: `linear-gradient(180deg, #0F1335 0%, rgba(37,36,118,.3) 44%, #0F1335 94%)` is the background for full-width dark sections.
- **indigoRise**: `linear-gradient(0deg, rgba(37,36,118,0), rgba(37,36,118,.2) 24%, rgba(37,36,118,.6) 56%, #0F1335)` creates indigo light that rises from the bottom of hero and media areas.
- **accentBeam**: `linear-gradient(180deg, rgba(15,19,53,0), #00AEE8 75%, #A9E8FD)` is the thin vertical cyan line that marks the active slide or section.

## Typography

**Family:** `"Geomanist", Arial, sans-serif` is used everywhere, with no secondary family. Load the fonts from the repository:

```css
@font-face {
  font-family: "Geomanist";
  src: url("/assets/fonts/geomanist/geomanist-regular.ttf") format("truetype");
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Geomanist";
  src: url("/assets/fonts/geomanist/geomanist-book.ttf") format("truetype");
  font-weight: 700; font-style: normal; font-display: swap;
}
```

Downloaded font files (verify the license before use):

- `assets/fonts/geomanist/geomanist-regular.ttf` is weight 400.
- `assets/fonts/geomanist/geomanist-book.ttf` is weight 700.

**Weights:** only 400 (regular) and 700 (bold) are used.

| Role | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|
| Display (H1 hero) | 67px | 700 | 1.15 | −0.015em |
| H2 / stat value | 56px | 700 | 1.15 | −0.01em |
| H3 | 40px | 700 | 1.15 | 0.16px |
| Card title | 23px | 700 | 1.3 | 0.16px |
| Section label / tabs | 18px | 700, UPPERCASE | 1.4 | 0.16px |
| Lead / stat label | 18px | 400 | 1.5 | 0.16px |
| Body | 16px | 400 | 1.25–1.65 | 0.16px |
| Navigation | 15px | 400 | 1.6 | 0.16px |
| Small | 14px | 400 | 1.7 | 0.16px |
| Caption | 11px | 400 | — | 0.16px |

Headings are short, sentence case and white on dark. Section eyebrow labels (`OFERTA`, `CASE STUDY`, `KARIERA`) are bold uppercase at 18px and sit above the H2.

## Spacing

The base unit is **4px**. Scale: 4, 8, 12, 16, 20, 24, 28, 32.

| Token | Value | Usage |
|---|---|---|
| `layout.containerMaxWidth` | 1440px | Content container (`container-fluid`) |
| `spacing.containerX` | 80px | Horizontal container padding on desktop |
| `spacing.sectionY` | 105px | Vertical section padding |
| `spacing.heroTop` / `heroBottom` | 154px / 88px | Hero padding, which clears the fixed header |
| `spacing.card` | 30px | Card inner padding |
| Navigation gap | 24px | Between top-level nav items |

The layout is generous, with large vertical rhythm and wide left-aligned text columns of about 480–560px next to large imagery.

## Border radius

| Token | Value | Usage |
|---|---|---|
| `none` | 0px | **Default.** Cards, images, sections and case-study tiles are square. |
| `sm` | 4px | Small controls and inputs *(proposed)* |
| `md` | 10px | Minor UI elements |
| `lg` | 32px | Cyan arrow circle (32×32 button) |
| `pill` | 44px | Floating "Skontaktuj się" badge |
| `xl` | 48px | Large rounded containers (rare) |
| `circle` | 50% | Icon buttons, focus rings, glow decorations |

Rule: content blocks stay square, and only interactive affordances are rounded.

## Components

### Header / navbar

- `position: fixed`, height 89px, background `rgba(255,255,255,0.05)` with `backdrop-filter: blur(32px)`, and a bottom border of `1px solid rgba(255,255,255,0.1)`.
- Left to right: white logo (132px wide), vertical divider, nav links (15px, 400, white, 24px gap, dropdown chevrons on "Firma" and "Oferta"). On the right sit search, language switch and globe icons, separated by thin dividers.

### Primary CTA: arrow link

The signature control. It has no filled rectangular button.

- Text label (16px, 400, white on dark, black on light), followed by a **32px cyan circle** (`#00AEE8`) with a white right arrow.
- On feature sections the circle sits inside a large thin ring of about 84px (`1px` cyan at low opacity).
- Examples: "Zobacz więcej", "Napisz do nas", "Zobacz więcej historii".
- A filled `button.primary` variant (cyan background, pill radius) is *proposed* for forms where an arrow link is not enough.

### Tabs (sector navigation)

- Uppercase 18px bold labels in a row. Inactive tabs use `rgba(255,255,255,0.3)` and the active tab is white. A `1px rgba(255,255,255,0.1)` divider runs under the row.
- A vertical cyan `accentBeam` line marks the active panel.

### Stats

- Value 56px/700 white (`65%`, `450`, `200`) above a label at 18px/400 (`firm energetycznych`).

### Cards

- **Career/story card:** image on top, white panel below with 30px padding, title 23px/700 black. The card is square.
- **Case-study card:** `#F9F9F9` background, 408px wide in a horizontal swiper, square corners, title 23px/700.

### Links

- **Underline link** (side menus such as "Oferty pracy" and "Onboarding"): white 16px text with a 1px white underline offset by 4px.

### Floating contact badge

- White pill (`radius 44px`, `1px #F1F1F1` border) fixed at the bottom right, with a chat icon. It expands to "Skontaktuj się" (16px/700, black).

### Inputs *(proposed, not on homepage)*

- Glass background `rgba(255,255,255,0.05)`, `1px rgba(255,255,255,0.1)` border, 4px radius, 12px 16px padding, white 16px text, and a cyan `#00AEE8` focus border.

## Logo usage

- Use [`assets/logo.svg`](../assets/logo.svg) (white) on dark backgrounds, which is the default for this brand. It appears in the header at 132×16px, left-aligned with the container edge (80px inset).
- Use [`assets/logo-dark.svg`](../assets/logo-dark.svg) (`#01080F`) on white or `#F9F9F9` surfaces.
- Do not recolor the logo with the cyan accent, stretch it or place it on busy imagery without a dark overlay. Keep clear space at least equal to the logo height (16px) on all sides.
- The SVG uses a luminance mask whose `fill="white"` must stay white in both variants.

## Visual style summary

Asseco presents itself as a serious, enterprise-grade technology company with a calm, premium, dark-mode aesthetic. Deep navy and indigo backgrounds with soft glowing gradients and abstract 3D shapes suggest innovation without becoming playful. A single cyan accent is used sparingly for calls to action, so interactive elements stand out immediately. Typography is a clean geometric sans (Geomanist) set large and bold for headlines with plenty of whitespace, while square cards and photography keep the content grounded and corporate.
