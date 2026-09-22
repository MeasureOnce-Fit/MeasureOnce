# M5 Retailer Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated interactive M5 review route that presents the retailer product-page widget and catalog coverage console without implementing live integration behavior.

**Architecture:** A static Next.js route renders one client component with local review state. The component owns view switching and widget-state switching; all fictional catalog values live beside the view so no API, account, or catalog repository is called. A dedicated CSS module reuses global MeasureOnce design tokens and supplies responsive layout rules.

**Tech Stack:** Next.js 16.3.5 App Router, React 19, TypeScript, CSS Modules, existing global MeasureOnce tokens.

**Spec:** `docs/superpowers/specs/2026-09-19-m5-retailer-review-design.md`

## Global Constraints

- Preserve the MeasureOnce warm-paper, ink, dusty-rose, cognac, editorial-serif visual system.
- Use only fictional retailer, product, catalog, and measurement data.
- Do not call a production API or mutate account/catalog data from this review route.
- Keep retailer manual size selection visible in every widget state.

---

### Task 1: Create the isolated M5 review route

**Files:**
- Create: `src/app/m5-review/page.tsx`
- Create: `src/app/m5-review/retailer-review.tsx`
- Create: `src/app/m5-review/retailer-review.module.css`

**Interfaces:**
- Consumes: global CSS variables `--paper`, `--ink`, `--accent`, `--accent-soft`, `--accent-deep`, `--line`, `--serif`, `--sans`, `--mono`.
- Produces: an interactive route at `/m5-review` with `product` and `console` review views and `start`, `recommended`, `needs-evidence`, `unavailable`, and `manual` widget states.

- [x] **Step 1: Write the route shell**

```tsx
export default function M5ReviewPage() {
  return <RetailerReview />;
}
```

- [x] **Step 2: Implement the local review state**

```tsx
type ReviewView = "product" | "console";
type WidgetState = "start" | "recommended" | "needs-evidence" | "unavailable" | "manual";
const [view, setView] = useState<ReviewView>("product");
const [widgetState, setWidgetState] = useState<WidgetState>("start");
```

- [x] **Step 3: Build the product-page review view**

```tsx
<section aria-label="Fictional retailer product page">
  <select aria-label="Retailer manual size">...</select>
  <section aria-label="MeasureOnce fit widget">...</section>
</section>
```

- [x] **Step 4: Build the catalog coverage console**

```tsx
<table>
  <caption>Fictional catalog coverage</caption>
  <thead>...</thead>
  <tbody>{coverageRows.map((row) => <tr key={row.sku}>...</tr>)}</tbody>
</table>
```

- [x] **Step 5: Add responsive and accessible styling**

```css
@media (max-width: 760px) {
  .productGrid { grid-template-columns: 1fr; }
  .tableWrap { overflow-x: auto; }
}
```

- [x] **Step 6: Run static checks**

Run: `npm run lint; npm run typecheck; npm run build`

Expected: all commands exit 0.

### Task 2: Verify the review journey

**Files:**
- Verify: `src/app/m5-review/retailer-review.tsx`
- Verify: `src/app/m5-review/retailer-review.module.css`

**Interfaces:**
- Consumes: local-state controls from Task 1.
- Produces: browser evidence that each widget state, the console, and mobile layout render without errors or horizontal overflow.

- [x] **Step 1: Start the local application**

Run: `npm run dev -- --port 3000`

Expected: the server listens on `http://localhost:3000`.

- [x] **Step 2: Review each widget state in the browser**

Use the review-state controls and confirm each state retains the manual retailer size selector.

- [x] **Step 3: Review the console and mobile layout**

Open the catalog console, then test at a 390px viewport. Confirm the table scrolls within its own wrapper and the document does not overflow horizontally.

- [x] **Step 4: Record completion evidence**

Update `tasks/todo.md` with exactly the implemented mock behavior and command/browser results. Do not describe this as a real retailer integration.
