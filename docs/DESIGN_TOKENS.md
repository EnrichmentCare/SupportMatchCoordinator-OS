# Coordinator OS — Proposed Design Tokens

Derived from the live Support Match brand (pink / purple / white, warm and human,
"matched not allocated"). **These are proposed** — on approval I'll lock the exact
hex values by inspecting the live site's compiled CSS so the app matches pixel-for-pixel.

## Colour

| Token | Hex (proposed) | Use |
|---|---|---|
| `brand.purple.700` | `#5B2A86` | Primary brand, headings, primary buttons |
| `brand.purple.600` | `#6D28D9` | Hover / active primary |
| `brand.purple.100` | `#EDE6F6` | Tinted surfaces, selected nav |
| `brand.pink.500` | `#E6398A` | Accent, CTAs ("Request a Support Worker"), highlights |
| `brand.pink.100` | `#FCE4F0` | Accent tint, badges |
| `neutral.900` | `#1A1523` | Body text |
| `neutral.500` | `#6B6577` | Secondary text |
| `neutral.200` | `#E7E4EC` | Borders, dividers |
| `neutral.50` | `#FAF9FC` | App background |
| `white` | `#FFFFFF` | Cards, surfaces |

### Semantic (RAG + states)
| Token | Hex | Use |
|---|---|---|
| `status.green` | `#12805C` | RAG healthy / success |
| `status.amber` | `#B26A00` | RAG attention / warning |
| `status.red` | `#C0341D` | RAG urgent / error |
| `info` | `#2563EB` | Informational |

All pairings target **WCAG 2.1 AA** (≥4.5:1 body, ≥3:1 large/UI). The pink accent is
used for fills with white text only at `pink.500`+; pink text on white is avoided
below AA.

## Typography
- **Font:** Inter (UI) — clean, professional, free, excellent legibility. Confirm if the site uses a specific brand face.
- Scale: `xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 / 3xl 30 / 4xl 36`.
- Weights: 400 body, 500 medium, 600 semibold (headings/buttons).

## Spacing / radius / shadow
- Spacing: 4px base grid (`1=4 2=8 3=12 4=16 6=24 8=32`).
- Radius: `sm 6 / md 10 / lg 14 / xl 20 / full 9999`. Cards `lg`, buttons `md`, pills `full`.
- Shadow: subtle, layered — `sm` for cards, `md` for popovers/modals. No heavy drop shadows.

## Feel
Modern SaaS polish (HubSpot), simple (ClickUp), flexible (Airtable), clean (Notion).
Generous whitespace, rounded cards, soft purple/pink accents on a near-white canvas.
Every component ships with empty, loading, and error states.
