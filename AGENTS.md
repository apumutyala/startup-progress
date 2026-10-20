# Maintaining startup-progress

This repository publishes the password-protected site at `https://apumutyala.github.io/startup-progress/`. GitHub Pages serves `main` from the root. Keep the existing audience and password protection when updating it.

## Editable source

`index.html` is the self-contained encrypted website. `tools/site.mjs` recovers and packages editable source. Its default private directory is `~/.codex/private-sites/startup-progress`, outside this public checkout:

- `site.html`: decrypted application shell, styles, rendering code and embedded dataset.
- `content.json`: editable records, thesis, provenance and update history. This is the dataset used when packing.
- `source-state.json`: fingerprint of the encrypted version the source was opened from. This prevents overwriting a newer version with stale source.

Do not put decrypted source, screenshots, passwords or derived keys in this repository. The helper takes the existing password as a JSON object through stdin, never as an argument, environment variable or saved file. Use a process API to supply stdin without printing it. Do not save the password in these instructions.

Commands, from this checkout:

```text
node tools/site.mjs unpack --source PRIVATE_DIRECTORY
node tools/site.mjs validate --source PRIVATE_DIRECTORY
node tools/site.mjs pack --source PRIVATE_DIRECTORY --check
node tools/site.mjs pack --source PRIVATE_DIRECTORY
```

Unpack refuses to replace unfinished edits. Pack refuses a stale encrypted base. Preserve local work and merge against a fresh unpack if either check fails. Check the Git working tree and remote state before editing; do not replace another session's work or force-push.

## Incorporating a conversation update

Update the affected content, rather than appending an unrelated note:

- Thoughts and opinions belong in `thesis.views`, with their provenance, uncertainty, next test and what would change the position. Distinguish explicit user direction, source opinion, working hypothesis and open decision.
- A changed position keeps its stable ID. Add the former position to `thesis.revisions` with the date, reason and source. Revise related decisions, questions and experiment explanations when affected.
- New progress belongs in the relevant chapter record. Date the reported event and identify its supporting artifact when available. A plan or self-report must not become a measured result or signed commitment.
- Append one concise entry to `updates` with date, source and affected thesis/record/section targets. Preserve prior entries. Update `meta.updatedAt` and increment `meta.revision`.
- Keep `meta.sourceReviewedAt` and source coverage separate from the website update date. Updating one view does not refresh every old relationship, grant term or claim.
- When evidence or priorities change, update the relevant `directionAssessments` too. Keep practical next action, technical feasibility, potential significance, commercial validation and bounded alignment contribution separate. Never turn these judgments into invented numerical scores or a percentage of alignment solved. Candidate nodes branch independently from role discussions; do not restore a chain between people.
- Maintain `projectMap` as the landing navigation: five tracks, stable node IDs, dated status categories, bounded evidence summaries, uncertainty, next tasks, typed dependencies and links to deeper material. Keep proposed, failed, gated and historical work distinguishable. Private reference links retain their access requirements. Do not use PC-local paths as browser links for iPad readers. Preserve existing routes and verify browser Back and Forward when changing navigation.

The thesis is a maintained interpretation, not evidence of universal agreement. Retain unresolved conflicts and attributed historical positions. Preserve original grant application text, budgets, source references and the embedded sketch unless the user explicitly requests a change. Use descriptive wording. Label hypothetical examples and proposed experiments.

## Verification and publication

Validate and package with the helper. Inspect the affected behavior in a real browser, including unlocking, navigation, relevant links and locking; check mobile layout for UI changes. Keep checks proportional to the change. Review staged files so only the encrypted site, maintenance code and public documentation are included.

Commit the completed change and push to the existing Pages branch when the user has requested a site update. Confirm the Pages build for that commit and verify the live result. Do not schedule background monitoring, contact people, submit applications or execute research merely because a site entry mentions them.
