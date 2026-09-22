---
version: alpha
colors:
  ink: "#171714"
  paper: "#F3F0E9"
  surface: "#FFFFFF"
  accent: "#C96F52"
  accentDeep: "#8E412F"
  accentSoft: "#EAD0C6"
  supportingSurface: "#D8BBB0"
  line: "rgba(23, 23, 20, 0.18)"
  muted: "#716F68"
  danger: "#963F45"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
  utility:
    fontFamily: "DM Mono, Consolas, monospace"
rounded:
  control: "12px"
  panel: "20px"
  pill: "999px"
spacing:
  unit: "4px"
components:
  button:
    minHeight: "44px"
  focusRing:
    color: "#8E412F"
    width: "3px"
---

# MeasureOnce Design System

## Overview

MeasureOnce should feel like a precision fitting studio translated into software: measured, calm, legible, and specific. The product combines a retail surface with an evidence workspace, so brand moments can be expressive while account and fit decisions remain familiar and easy to audit.

The memorable signature is the **fit trace**: fine dusty-rose paths connect a known garment, the evidence used, and a recommended result. It may become spatial and interactive in M4. M2 uses the same idea through lines, state changes, and profile transitions without adding decorative 3D.

Preserve the storefront's established editorial typography, exact warm-paper palette, terracotta accent, dusty-rose section surface, fine rules, and spacious product layouts. New account and integration screens must look like another part of the same retailer experience. Avoid blue, green, black-heavy surfaces, trend-driven replacement palettes, generic dashboard gradients, glass-heavy panels, fictional proof metrics, and motion that delays a task.

## Colors

Near-black ink carries text. Warm paper is the canvas, white is reserved for product and form surfaces, terracotta marks primary fit actions, and deep terracotta carries focus and selected states. Dusty rose separates larger Fit Passport regions. Danger is used only for destructive actions and errors.

The runtime owner is `src/app/globals.css`. Tokens in this file map one-to-one to CSS custom properties there.

## Typography

Instrument Serif is reserved for large brand statements and major page titles. Manrope carries product copy and controls. DM Mono carries evidence labels, identifiers, units, and status text. Product forms never use the display face for field labels or body copy.

## Layout

Marketing routes may use asymmetric editorial composition. Product workspaces use a stable 12-column desktop grid and a single-column mobile flow. Account screens keep the active profile and task controls visible without fixing the whole page height.

Desktop account workspace:

```text
┌ navigation ───────────────────────────────────────────────┐
│ profile rail (4 cols) │ active profile workspace (8 cols)│
│ identity + switcher   │ evidence, consent, rights        │
└───────────────────────────────────────────────────────────┘
```

## Elevation & Depth

Static surfaces use borders and tonal separation. Elevation is reserved for overlays, active floating controls, and the fit trace's focused state. Shadow never substitutes for hierarchy.

## Shapes

Use 12px controls and 20px major panels. Pills are limited to status, filters, and profile chips. Data tables and evidence blocks stay rectangular and dense enough to compare values.

## Components

Buttons use at least 44px height. Primary actions use the storefront's ink or deep-terracotta treatments; secondary actions use paper or white with an ink or line border; destructive actions stay separated and name the consequence. Inputs always have visible labels, persistent help/error space, and a high-contrast deep-terracotta focus ring.

Dialogs are app-owned, focus-managed, and responsive. Account and profile deletion use an alert dialog with the least destructive action focused first. Status messages remain visible near the affected operation and are announced through a live region.

## Do's and Don'ts

- Do show which profile is active before every fit action.
- Do state whether data is saved, session-only, or unavailable.
- Do keep fit evidence and privacy controls readable without hover.
- Do respect reduced motion and preserve a complete non-WebGL path.
- Don't use relationships such as partner, husband, or child as profile types.
- Don't show invented confidence percentages, retailer logos, or customer outcomes.
- Don't use Three.js for forms, navigation, consent, or account management.
