# MeasureOnce landing design direction

Research checked: 17 September 2026. Proposal only; application changes require the user's approval. This note does not change the PRD, design system, or product contracts.

## Evidence and scope

The six supplied screenshots provide useful patterns: clear navigation, a brand strip, a product preview, garment-focused explanation, outcome cards, FAQ, and footer. The current [True Fit homepage](https://www.truefit.com/) also presents a shopper-question demo, merchant analytics, commercial claims, and FAQ. These establish what the competitor presents, not independently verified evidence for its claims or evidence for MeasureOnce. Image 5 describes business pain and consequences, rather than implementation deliverables. We should translate its visual clarity into concrete capabilities and link measured results only when available.

MeasureOnce's agreed scope is a retailer-integrated fit service with a multi-brand showcase, all 11 existing clothing categories, and synthetic brand/product/shopper data. Both body-measurement and known-garment entry paths are now required. Both accept inches and centimetres. Competitor screenshots do not add kids, footwear, MCP, agentic shopping, confirmed retailer customers, or commercial performance claims to that scope.

## Proposed composition

The signature is an interactive **same shopper, different labels** comparison, inspired by a tailor's measuring instruments. A horizontal measurement scale connects a shopper's fit inputs to three actual synthetic catalog results. It demonstrates cross-brand sizing rather than relying on a generic chatbot animation.

| Section | MeasureOnce direction | Honest content rule |
| --- | --- | --- |
| Header and hero | Sparse navigation: How it works, Try the demo, Evaluation. Proposed headline: “Different brands. A fit profile that travels with you.” Primary action opens the comparison; secondary action opens the showcase. | Reuse across brands is within the demonstration retailer; do not imply cross-retailer identity sharing. |
| Fictional-brand strip | A quiet horizontally moving strip of fictional catalog wordmarks and garment-category labels. Selecting a brand loads that brand into the comparison. Caption: “Explore the fictional brands in our demo.” | Never “Trusted by” or real retailer logos. Visible pause control; static layout for reduced motion. Names are placeholders until catalog naming is resolved. |
| Live comparison preview | Two entry choices: “Use my measurements” and “Compare a garment I own.” Category control exposes relevant fields, an inches/cm switch, and fit preferences. Results show brand, size, garment image, regional explanation, and evidence details. | Future preview must call the same recommendation service as the showcase. During development, label fixtures explicitly. No scripted result masquerading as a live recommendation. |
| Garment fit visual | Product-only garment image with labelled chest/shoulder/length or waist/hip/length callouts appropriate to its category. A text list supplies the same information. Selecting “waist too tight” leaves the independent length observation intact. | Generated product images are illustrative. Callouts describe stored synthetic measurements; do not imply visual measurement extraction or physical fit simulation. |
| Capabilities | Four restrained cards: Saved Fit Passport; Cross-brand comparison; Fit explained by region; Reproducible evaluation. Each leads to the working feature or published evidence. | No invented conversion uplift, return reduction, live user counts, or validated accuracy. Unbuilt capability remains marked planned or excluded from public finished-product copy. |
| FAQ | What information do I need? Can I use inches or cm? Why does my size differ by brand? What happens when no size matches? Are the brands and results real? How can I edit/delete my profile? | Answer according to delivered behaviour. No promises of continuous learning or real-world validation before those exist. |
| Footer | Product, Documentation/Evaluation, and About/Contact groups, with working privacy and accessibility information when ready. | No empty links, invented careers/team, fabricated certifications, partner logos, or support commitments. |

## Visual proposal, not an approved token change

- Palette: Paper `#FFFFFF`, Mist `#F3F6FB`, Ink `#182233`, Muted ink `#536176`, Cobalt `#2456C5`, Border `#D5DEEA`. No green, teal, purple washes, or decorative gradients.
- Typography direction: restrained geometric display typography (proposed Manrope), plain readable body typography (proposed Source Sans 3), tabular figures for measurement comparisons. Confirm existing runtime typography before selecting/installing fonts.
- Layout: spacious hero; one visually dominant comparison instrument; quieter sections beneath. On mobile, controls precede a single stacked result comparison; never shrink a desktop screenshot into an unreadable frame.
- Motion: a brief measurement-scale transition when a user changes inputs; optional quiet brand-strip motion only. No autoplay conversational simulation, scroll hijacking, or parallax. Product text and controls remain usable without animation.

## Acceptance criteria for the later implementation

1. The live preview uses the production recommendation endpoint against synthetic catalog records. Measurement/profile changes affect the response; cm/in equivalents return the same recommendation. Loading, timeout, invalid input, insufficient evidence, and no suitable size have explicit states.
2. Both entry paths remain usable by keyboard and touch. Saved profile changes are never written without the intended save action. Anonymous exploration is separate from authenticated saving.
3. Every synthetic brand, shopper example, and evaluation result is clearly identified where its interpretation matters. No visual element implies a real commercial partnership.
4. All 11 existing categories remain reachable; recommendations and measurement labels use the category's actual schema. Men/women catalog divisions do not force unsupported biological or body-shape assumptions.
5. Images retain their full garment extent; comparison cards, form errors, and FAQ answers are not clipped. Check a narrow viewport and 200% zoom, keyboard focus, contrast, screen-reader names, and loading geometry.
6. A moving rail that starts automatically, lasts beyond five seconds, and appears alongside other content has a persistent pause/stop mechanism. Reduced-motion preferences show static content. [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
7. FAQ disclosure buttons use heading structure, expanded state, keyboard activation, and associated panels. [W3C accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)
8. Non-essential motion can be disabled; no information is available only through animation or hover. This is an explicit product preference beyond the AA baseline; interaction-motion criterion 2.3.3 is AAA. [W3C Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

## Sequence and self-critique

The attractive preview depends on actual measurement contracts and meaningful recommendation behaviour. First build and test unit conversion, synthetic brand/garment schemas, independent regional constraints, and a transparent baseline engine. Then connect accounts and the API, and finally build the landing preview against that service. Design exploration can continue in parallel without making the current seed-derived result look more credible than it is.

A logo carousel alone would imitate competitor polish without demonstrating value. The selectable fictional-brand strip and live measurement comparison earn their space by teaching how the product works. An LLM chat interface would add cost and uncertainty without improving this initial demonstration; structured controls are sufficient. Marketing claims must remain narrower than the software's demonstrated evidence.

Verification for this research task: read both frontend-design skills, global/project agent guidance, the existing milestone document, and W3C primary sources; inspected the user-provided screenshots and current competitor homepage text. No application code, runtime design tokens, PRD, or product contracts changed. No runtime UI or accessibility checks were claimed for this planning-only task.
