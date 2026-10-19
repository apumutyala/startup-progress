# startup-progress

An encrypted, password-protected working archive based on the existing `startup-progress.html` artifact.

The site contains 114 source records and an alignment experiment section spanning eight scales. Mechanism diagrams and support/counterexample views describe proposed tests; their example outcomes are illustrative, not measured results. Original grant application text, budgets, source references and the handwritten sketch are retained.

The website is a single self-contained `index.html`. Its binder and embedded source image remain encrypted with AES-256-GCM. Unlocking derives the key locally using PBKDF2-SHA-256 with 600,000 iterations. The password is not part of this repository.

## Hosting

GitHub Pages serves the root of the `main` branch over HTTPS, matching the Learning Atlas setup. `.nojekyll` keeps this a plain static site.

Only encrypted site content belongs in this repository. Keep decrypted exports, passwords, and browser QA captures outside the checkout.
