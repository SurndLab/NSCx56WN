# NSCx56WN Copilot Instructions

## Project Overview

This repository is the National Skills Competition Module C project.
Build and maintain a server-rendered content website that reads article files from `contentpages/` (or `content-pages/`) and serves pages, folders, tags, and search routes.

Main runtime stack for this project:
- Node.js (required)
- npm packages that are allowed by the competition environment
- Cheerio is allowed and already used for HTML parsing

## Highest Priority Rule (Non-Negotiable)

Always implement according to the competition documents in this order:
1. `docs/infra.md` (available environment and tool constraints)
2. `docs/plan.md` (functional requirements and scoring items)

If there is any conflict between current code and these documents, update code to match `docs/infra.md` and `docs/plan.md`.

## Implementation Rules

- Do not introduce frameworks/tools that are not available per `docs/infra.md`.
- Keep the implementation aligned with all required routes and behaviors in `docs/plan.md`.
- Prioritize scoring-related requirements from the plan (routing, listing/filtering/sorting, content rendering, tags, search, loader, accessibility).
- Preserve maintainable server-side code and clear structure in `src/`.
- Keep security basics in place: path traversal prevention, safe HTML output handling, and stable error handling.

## Change Policy

- Before major refactors, verify they still satisfy `docs/plan.md` scoring points.
- Prefer minimal, targeted changes over broad rewrites unless required for compliance.
- Any new behavior should be justified by explicit requirements from `docs/plan.md`.

## Output Expectation for Copilot

When asked to implement or review:
- First check compliance with `docs/infra.md` and `docs/plan.md`.
- Then propose/apply fixes that maximize competition scoring and compatibility.
- If a requested approach violates infra constraints, reject that approach and provide a compliant alternative.
