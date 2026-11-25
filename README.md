# Alternative Systems

An encrypted, password-protected working archive based on the existing `startup-progress.html` artifact.

The site contains a working thesis, dated update history, 114 source records and an alignment experiment section spanning eight scales. Current positions distinguish explicit direction, source opinions, working hypotheses and open decisions. Earlier positions remain in revision history. Mechanism diagrams and support/counterexample views describe proposed tests; their example outcomes are illustrative, not measured results. Original grant application text, budgets, source references and the handwritten sketch are retained.

Research and product directions are compared separately on practicality, technical feasibility, potential significance, commercial validation and bounded alignment contribution. These are qualitative assessments with evidence and explicit limits, not invented scores or a percentage of alignment solved. People nodes branch independently from role discussions. The project map opens as a full-window canvas with pan, zoom and floating node details.

Unlocking opens a five-track project map. Tracks separate research, business deployments, public-interest work, funding and organization, and current experiments. Search and a list view provide equivalent access to the map entries. Each entry distinguishes dated evidence, uncertainty, next actions and typed relationships. Selected tracks and nodes have stable links, with browser Back and Forward navigation.

The website is a single self-contained `index.html`. Its binder and embedded source image remain encrypted with AES-256-GCM. Unlocking derives the key locally using PBKDF2-SHA-256 with 600,000 iterations. The password is not part of this repository.

## Hosting

The primary site is [altsys.ai](https://altsys.ai/), also available at [www.altsys.ai](https://www.altsys.ai/). Cloudflare Workers Static Assets serves the `altsys-site` Worker. The existing GitHub Pages site remains a secondary copy; no Cloudflare Pages project is used.

This is plain HTML with client-side navigation. `npm run build` copies only the encrypted `index.html` into `dist`; `npm run deploy` publishes it using Wrangler. `npm run preview` starts Wrangler locally. Keep `dist`, dependencies, credentials and local Wrangler state out of Git.

Existing DNS records must never be modified or deleted, particularly the Email Routing MX, SPF and DKIM records. Custom domains may add website records only when no conflicting records exist. Run deployments in an interactive terminal and decline any prompt to replace an existing record. See [AGENTS.md](AGENTS.md) for the maintenance constraints.

Only encrypted site content belongs in this repository. Keep decrypted exports, passwords, and browser QA captures outside the checkout.

## Updating the site

Conversation updates are incorporated into the relevant positions, decisions and progress records, with a dated change entry. The site update date is separate from the source-review date. There is no background monitoring or automatic ingestion of unrelated conversations.

The reusable `tools/site.mjs` helper unpacks and validates private editable source, then encrypts it back into `index.html` with the existing password. It preserves unfinished edits and refuses to overwrite a newer encrypted base. See [AGENTS.md](AGENTS.md) for the maintenance workflow and content schema.
