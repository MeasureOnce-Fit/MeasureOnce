# PRD length and format: researched guidance for MeasureOnce

**Research date:** 17 September 2026  
**Question:** Is there a standard number of pages for a product requirements document, and what format should MeasureOnce use?

## Answer

There is no industry-wide, ISO, IEEE, or “FAANG” page-count standard for a PRD. The strongest current guidance says the length should follow the scope, audience, and decisions the document must support.

Figma states this directly: “there’s no universal page count”; it suggests one page for a smaller feature and more for a complex or cross-team initiative. Aha! similarly says there is “no one ideal PRD template format,” and that the appropriate contents depend on the industry, the organization’s development maturity, and the product. Productboard says a PRD should be long enough to create shared understanding while remaining clear and concise, and that its contents vary by organization, team, and product.

The familiar numbers people cite are house formats for particular purposes:

- Atlassian describes a **one-page dashboard or landing page** for requirements associated with an epic, with research, diagrams, design work, technical documents, and work items linked from it.
- Amazon caps its general decision narratives at **six pages in the body**. Its product-idea artifact is a **PR/FAQ**, where the press release is under one page and the FAQ is up to five pages. Amazon itself describes the PR/FAQ as a Working Backwards mechanism used before coding. It is not a universal PRD standard.
- Google’s public documentation guidance says to write short, useful, current documents and remove unnecessary material. It also says design documents and PRDs may discuss a proposed implementation at length while gathering feedback. Google gives no PRD page limit in that guidance.

The closest formal requirements standard is ISO/IEC/IEEE 29148:2018. It specifies requirements-engineering processes, required information items, their contents, and guidance on their format. Its scope applies regardless of project size or complexity. The ISO summary does not prescribe a product-management PRD or a PRD page count. ISO currently identifies the 2018 edition as the published standard, confirmed in 2024, with a replacement draft in development.

## Recommendation for MeasureOnce

MeasureOnce should use a **12–15 page core PRD**, excluding the cover, table of contents, references, and appendices. A reasonable writing target is roughly **4,000–5,500 words**, with tables and diagrams used where they communicate requirements more efficiently than prose.

This range is an editorial recommendation for this product, not an external rule. MeasureOnce is a full product and retailer platform initiative rather than one small feature. It includes a shopper experience, reusable Fit Passport, authentication and privacy controls, five fit families spanning 11 catalog categories, garment-data requirements, recommendation and abstention behavior, model evaluation, retailer integrations, accessibility, and a staged pilot. Compressing that into three pages would produce a product brief, not an implementation-ready PRD.

A useful document package would be:

1. **Core PRD: 12–15 pages.** This is the decision and alignment document. It should be readable in one sitting and contain every product decision needed to understand what is being built, why it matters, what is in and out of scope, and how readiness will be judged.
2. **Executive summary: the first 1–2 pages of the PRD.** It should state the customer, problem, product promise, current evidence, release decision, P0 scope, and success measures. It should not be a separate three-page substitute for the PRD.
3. **Linked execution artifacts and appendices: as long as the evidence requires.** Detailed data schemas, APIs, event contracts, model-evaluation protocols, privacy data maps, security threat models, research notes, and exhaustive acceptance matrices should sit here. They can be included in one exported portfolio PDF, but they should remain clearly separated from the core narrative.

The page count should never be reached by shrinking type, tightening margins, or moving essential decisions into tiny footnotes. If the core exceeds about 15 pages, first move implementation detail and evidence tables to linked annexes. If it remains longer because the product decisions themselves are numerous, keep the necessary pages rather than editing away requirements.

## Suggested 12–15 page budget

| Core section | Approximate space | What it must accomplish |
|---|---:|---|
| Document control and executive decision summary | 1–1.5 pages | Owner, status, version, target release, approvers, one-paragraph product definition, decision requested, current product state |
| Problem, evidence, users, and buyer | 1–1.5 pages | Shopper problem, retailer problem, evidence strength, target users, buyer and stakeholder map |
| Vision, principles, goals, non-goals, and success measures | 1–1.5 pages | Desired outcomes, guardrails, explicit exclusions, portfolio metrics versus future live-pilot metrics |
| Experience and journeys | 1.5–2 pages | Account and Fit Passport entry, product-page guidance, recommendation/abstention/unavailable states, privacy controls, manual fallback |
| Release scope and prioritization | 1 page | P0/P1/P2, five fit families, supported categories, portfolio release versus retailer-pilot boundary |
| Functional requirements and acceptance evidence | 3–4 pages | Numbered, testable requirements grouped by shopper, garment data, recommendation, evidence dashboard, and retailer operations |
| Data, model, and evaluation requirements | 1.5–2 pages | Evidence provenance, baselines, held-out evaluation, coverage, calibration, slice reporting, replay and traceability |
| Non-functional requirements | 1–1.5 pages | Privacy, security, accessibility, performance, resilience, tenancy, observability |
| Dependencies, risks, rollout, and open decisions | 1–1.5 pages | Partner dependencies, assumptions, release gates, risk treatment, owners and decision dates |

That allocation produces a document around 12–15 pages without forcing every row or visual to fit an artificial quota.

## Recommended content format

The current official templates overlap heavily. A practical MeasureOnce PRD should use this order:

1. **Document control** — title, owner, contributors, reviewers, status, version, last updated date, target release, and decision deadline.
2. **Executive summary** — what MeasureOnce is, who it serves, the problem it solves, what this release proves, and what decision the reader is being asked to make.
3. **Problem and evidence** — shopper and retailer problems, available research, current implementation facts, assumptions, and evidence gaps.
4. **Users and stakeholders** — shoppers, retailer product/commerce teams, merchandising, data, privacy, security, operations, and portfolio reviewers.
5. **Goals, success measures, and guardrails** — measurable outcomes, leading indicators, counter-metrics, and the distinction between synthetic portfolio evidence and live business impact.
6. **Non-goals and out of scope** — a visible list, not a buried paragraph.
7. **Product principles and experience** — the reference-garment approach, optional enrollment, category-aware questions, transparent reasons, explicit abstention, manual choice, and retailer-owned commerce.
8. **Scope and releases** — P0/P1/P2 or portfolio/pilot/later, with every category mapped to a supported fit family and a valid recommendation, abstention, or unavailable path.
9. **Functional requirements** — numbered requirements with priority and acceptance evidence. Use compact tables rather than long narrative blocks.
10. **Data, model, and evaluation requirements** — enough product-level detail to make the evidence promise testable. Link exact schemas, algorithms, and experiment notebooks to separate technical artifacts.
11. **Non-functional requirements** — privacy, security, accessibility, performance, availability, tenant isolation, and observability.
12. **Dependencies, risks, rollout, and open questions** — name an owner and decision date for each unresolved item.
13. **Appendices and linked artifacts** — research, diagrams, data contracts, technical design, detailed evaluation, claim substantiation, change log, and glossary.

Atlassian’s current template supports the core of this sequence: project specifics; goals and business objectives; background and strategic fit; assumptions; user stories and success metrics; linked design work; open questions; and an explicit out-of-scope section. Aha! and Productboard add the same recurring elements: outcome, measures, stakeholders/personas, context, scope, releases, requirements, UX, risks, constraints, dependencies, and open questions. Figma explicitly includes release criteria, non-functional requirements, risks, constraints, and an evaluation plan.

## Requirements-table format

For MeasureOnce, each material requirement should be traceable and testable. A compact row format is:

| ID | Requirement | Priority | Acceptance evidence | Release |
|---|---|---|---|---|
| MO-FIT-001 | When evidence is missing, conflicting, unsupported, or outside the evaluated distribution, the service returns `ABSTAIN` or `UNAVAILABLE` and does not include a recommended size. | P0 | Contract fixtures cover every reason code; UI shows one useful next action and preserves manual size choice. | Portfolio |

Keep the rationale near the parent section or in a short “why this matters” note rather than repeating it in every row. Put exact endpoint payloads, table definitions, model formulas, deployment topology, and detailed algorithms in a technical design or data contract. Asana’s design-document guidance assigns architecture, modules, data flows, APIs, schemas, algorithms, infrastructure, and detailed UI specifications to the design document. The PRD should specify the product behavior and acceptance conditions those designs must satisfy.

## Working-document and page-layout format

The source of truth should remain editable and collaborative, such as Word, Google Docs, Confluence, or a repository-backed Markdown document. Export a PDF for portfolio review and distribution. GitLab’s public product-development handbook illustrates the underlying principle: keep the issue or document description current as the single source of truth, and link research and design evidence rather than forcing every artifact into one static document.

For the requested polished Word/PDF version:

- Use US Letter because the launch and retailer context are US-based.
- Use 0.75–1 inch margins, 10.5–11 point body type, and roughly 1.1–1.2 line spacing.
- Keep body paragraphs fully justified if that is the chosen house style, with automatic hyphenation enabled to reduce uneven word spacing.
- Keep headings, bullets, requirement text in tables, and labels left-aligned; right-align numeric columns.
- Limit the hierarchy to three heading levels and number major sections.
- Put document status/version in the header or footer and use continuous page numbers.
- Use short paragraphs, descriptive headings, and tables only when readers need to compare repeated fields.
- Place each diagram beside the decision it explains. Link high-resolution or detailed versions in the appendix.
- Keep citations as readable footnotes or endnotes with live links. Mark vendor-reported claims and synthetic MeasureOnce results explicitly.
- Include a change log and update the PRD when product decisions change. A stale PRD is worse than a shorter current one.

## What a reviewer should be able to answer

Page count is only a useful editorial constraint. The document is complete when a product, design, engineering, data, privacy, and retailer reviewer can quickly answer:

- What customer and retailer problem are we solving, and what evidence supports it?
- What is being shipped in this release, and what is excluded?
- Which user journeys and failure states must work?
- What does each P0 requirement mean in observable, testable terms?
- What data is used, where did it come from, and what claims can it support?
- When must the recommendation system abstain?
- How will the portfolio release be evaluated, and how is that different from a live retailer pilot?
- What are the privacy, security, accessibility, and integration boundaries?
- What dependencies and unresolved decisions could block release, and who owns them?

If those answers are present and easy to find, the PRD is the right length. If they are absent, adding or removing pages by itself will not fix it.

## Primary and first-party sources

- [Figma — How to create a product requirements document](https://www.figma.com/resource-library/product-requirements-document/): explicitly says there is no universal page count; one page may suit a smaller feature, with more for complex or cross-team work. It also lists the core PRD content and distinguishes PRDs from technical specifications.
- [Atlassian — How to create a product requirements document](https://www.atlassian.com/agile/product-management/requirements): provides its “just enough” structure and explains its one-page landing/dashboard approach with linked supporting material.
- [Atlassian — What is a product brief?](https://www.atlassian.com/agile/product-management/product-brief): says a product brief is generally one to two pages and that detailed requirements, user stories, and UX specifications belong in the later PRD. This is why a three-page MeasureOnce document should be treated as a brief, not the full PRD.
- [Aha! — Product requirements document templates](https://www.aha.io/roadmapping/guide/requirements-management/what-is-a-good-product-requirements-document-template): says no one ideal PRD template format exists, explains why form depends on product and organization, and lists both lean and comprehensive structures.
- [Productboard — Product Requirements Document](https://www.productboard.com/glossary/product-requirements-document/): says a good PRD only needs to be long enough for shared understanding and gives a variable, organization-dependent outline.
- [Google — Documentation Best Practices](https://google.github.io/styleguide/docguide/best_practices.html): recommends short, useful, current documentation and describes PRDs/design documents as feedback artifacts that should remain accurate records after implementation.
- [GitLab Handbook — Product Development Flow](https://handbook.gitlab.com/handbook/product-development/how-we-work/product-development-flow/): treats maintained issue descriptions as the single source of truth and connects validated problems, users/JTBD, business goals, success metrics, constraints, design evidence, and non-functional requirements through linked living artifacts.
- [Asana — Design document template](https://asana.com/templates/design-document): identifies architecture, modules, data flows, APIs, schemas, algorithms, infrastructure, and detailed implementation planning as design-document content, supporting a clear boundary between the core PRD and technical annexes.
- [Amazon — 2024 Letter to Shareholders](https://www.aboutamazon.com/news/company-news/amazon-ceo-andy-jassy-2024-letter-to-shareholders): says Amazon decision narratives have a maximum six-page body and separately identifies Working Backwards PR/FAQ documents used before coding.
- [Amazon — An insider look at Amazon’s culture and processes](https://www.aboutamazon.com/news/workplace/an-insider-look-at-amazons-culture-and-processes): gives the PR/FAQ house rule of a press release under one page and an FAQ of five pages or less, making clear that the common “six-page” number belongs to an Amazon mechanism.
- [ISO — ISO/IEC/IEEE 29148:2018](https://www.iso.org/standard/72089.html): defines the scope of the current published requirements-engineering standard and the information items and format guidance it covers.

## Research limits

Public documentation cannot prove that every team inside a large company follows one internal practice, and most companies do not publish their internal PRD templates. The conclusion is therefore limited to the official, public guidance above. It supports a strong negative finding: there is no publicly documented industry or FAANG page-count standard. The 12–15 page MeasureOnce target is a reasoned recommendation based on the product’s breadth and the shared principles in those sources, not a claim that an external authority mandates that number.
