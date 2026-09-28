# Foley Field Notes

An imaginary Foley desk: turn structured sound recipes into playable scenes and downloadable WAV files. Built for the September 2026 DEV Sanity challenge, Path Two.

## Run

Requires Node 24. Install with `npm ci`, then `npm run dev`. Open the printed URL (the Astro base path is `/foley-field-notes`). `npm test` runs the deterministic audio and workflow tests. `npm run build` produces a static site.

`npm run studio` starts the owner/editor interface on port3338. Sign in through Sanity with an account that is a member of the project. Public visitors do not need an account to audition, arrange or download audio. **Never publish editor credentials.**

## Content and architecture

- Sanity project: **vkj2ioma**, public dataset: **production**.
- `soundRecipe`: material, gesture, description, duration and typed synthesis layers; review state, actor, time and approved content signature.
- `soundScene`: an ordered cue sheet. Each cue references a recipe and specifies its start time and level.
- Astro ships a static page. The browser loads the published collection with GROQ; Refresh collection fetches edits. There is **no claim of automatic real-time synchronization**.
- A recipe appears only when its approved signature still matches its current content. Studio actions implement draft → review → approved; publication is disabled for unapproved or subsequently edited content. This is an editorial workflow, not a separation-of-duties enforcement system: project administrators can use the API directly.
- The seed's reviewer is `Demonstration seed (automated)`; no human review is claimed. Schema references make recipe reuse explicit across scenes.
- Browser-only synthesis uses deterministic noise, filtered noise, inharmonic tones and bounded envelopes. The sounds are **synthetic interpretations, not authentic recordings**. No microphone, audio samples or paid AI inference service is used.
- Scenes are limited to16cues/30seconds. Simultaneous cues are peak-normalized to0.85 before WAV export. Playback has a separate low initial volume; playback-volume changes do not alter the downloaded file.
- If the initial API read fails, the interface visibly labels its bundled demonstration pack. A later failed refresh preserves the current collection and arrangement.

## Seed your own project

Replace project ID in `sanity.config.ts`, `sanity.cli.ts`, and `src/client.mjs`. After normal `npx sanity login`, create a public `production` dataset. Run `node scripts/seed.mjs`, then `npx sanity dataset import seed.ndjson --dataset production --missing`. This adds only missing demo documents. Configure your own frontend origin for anonymous public reads. No write token belongs in the client bundle.

## Verification and limits

The audio tests verify deterministic generation, non-silence, bounded samples, cue timing, overlapping-cue normalization, PCM/WAV headers, invalid inputs and content-sensitive approval. Browser checks cover live content, cue editing, presets, playback start/stop, export, empty state, responsive widths320/393/768/1440 and the offline label. They do not substitute for subjective listening or actual Safari/device testing.

Arrangements live only in the current tab. Public visitors cannot save edits into Sanity. The editor interface requires project membership. The demo uses only free-plan features; do not enable paid features or add a billing method to reproduce it.

## AI assistance

This application, tests and documentation were implemented with Codex under Kanishq Sharma's direction. The build account is factual: no invented manual coding history or human review. The broader private working session and account details are not published. See BUILD_NOTES.md for decisions and limitations.

Original application code and synthesized seed recipes: MIT. Dependencies retain their own licenses. Fonts: DM Sans and DM Serif Display, loaded through Google Fonts under the SIL Open Font License.
