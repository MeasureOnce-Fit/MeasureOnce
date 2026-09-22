# M5 Retailer Review Design

## Purpose

Give a retailer-facing reviewer a concrete, interactive view of the first MeasureOnce integration before any retailer adapter, production catalog import, or live widget is built. The page is a visual contract review, not a working integration.

## Approved scope

The `/m5-review` page contains two views under one fictional retailer, **Aster Department Store**:

1. **Product-page widget:** an outerwear product detail page with the MeasureOnce fit module embedded where a retailer would place it. The reviewer can switch among start, recommended, more-evidence-needed, unavailable, and manual-size states. The widget describes its available input paths and keeps a retailer size selector visible.
2. **Catalog coverage console:** a retailer-operator view showing the same catalog’s coverage status, latest import outcome, measurement validation feedback, and which products can show the widget. The table uses fictional products and synthetic measurements only.

## Design direction

Reuse the approved MeasureOnce system: warm paper background, ink text, dusty rose/cognac accents, editorial serif headings, Manrope body text, and compact mono labels. The signature element is a visible **fit handoff seam**: the retailer product panel meets the MeasureOnce widget through a narrow stitched boundary rather than making the widget look like a separate dashboard.

## Boundaries

- No external retailer sign-in, identity exchange, database mutation, catalog upload, import, payment, checkout, or analytics request.
- No real retailer logo, product data, size charts, or success claim.
- All buttons change review-only local state and explicitly say so.
- The widget preserves the retailer’s manual size choice in every result state.

## Required review states

| State | Widget behavior | Manual size choice |
| --- | --- | --- |
| Start | Invites a Fit Passport check; identifies the current category. | Available |
| Recommended | Shows an exact synthetic label and a short regional reason. | Available, preselected label editable |
| Need evidence | Explains the missing category evidence and directs to the two permitted input paths. | Available |
| Unavailable | States the service is temporarily unavailable and that shopping continues. | Available |
| Manual | Hides the fit result and presents the retailer’s normal size selection. | Available |

## Verification

The review route must render at desktop and mobile widths, have labeled controls and focusable interactive elements, avoid horizontal overflow, and not send network requests when state switches. `npm run lint`, `npm run typecheck`, and `npm run build` must pass. Browser review confirms each state, the console, and mobile layout.
