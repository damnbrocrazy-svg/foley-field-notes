# Build notes — September 28, 2026

## The idea

Foley Field Notes treats content as something executable. A cup is not just a CMS card with a title: its content includes oscillator frequencies, envelopes and pulses. A scene references several recipes and gives each one a start time and level. Change a recipe and you change the sound of every scene that references it.

The six starting recipes and two scene descriptions are original, synthetic demonstrations. They are not recordings or claims about the acoustic properties of real materials. The imaginary field-notebook aesthetic is a creative framing.

## What the agent actually did

Codex implemented the schemas, deterministic synthesis engine, Astro page, interaction code, tests and documentation for Kanishq Sharma. This was an autonomous build with AI assistance, not a claim that the owner manually wrote every line. The design brief was to make a small, unusual, playable app with meaningful structured content and no paid runtime inference.

The first engine tests could not start because the local runner could not spawn a subprocess. Running Node's test runner without process isolation let the tests execute normally; assertions were preserved. Eleven tests then passed, including numerical audio checks, timing, WAV headers and approval invalidation. No subjective listening result is claimed.

The first browser pass exposed an implementation limitation on review: the volume control changed the number but affected only subsequent playback. The implementation was updated to change the active gain node too, and the static build/browser tests were rerun. The initial Studio build command used an obsolete flag; the current positional-output form built successfully. Schema validation returned zero errors and zero warnings.

## Sanity decisions

The frontend queries published documents, validates sound layers and excludes recipes whose approval signature no longer matches their current content. A local fallback is explicitly marked as an offline demonstration. It does not masquerade as a successful API read.

Review is modeled alongside the recipe. A custom Studio action requests review; another approves the current content and records an actor/time/signature. Content edits invalidate that signature. The publish action is disabled until the current content is approved. Optimistic revision checks prevent silently overwriting an intervening edit during a workflow action. This remains an editorial convention for trusted project members, not a system that prevents administrators from making direct API changes.

The initial demonstration pack records its approval actor as an automated seed. Public users can arrange cues in their own tab, but cannot alter the project's documents. The project uses a public dataset and only features available after its free trial returns to Free. No runtime write key is present in the frontend.

## Deliberate limits

There is no LLM agent, App SDK integration, live multiuser composer, auto-refresh claim, microphone capture, private client data or stock audio. Those are unnecessary for this bounded Path Two entry. The player has six recipes, two starter scenes, editable timings/levels and a real WAV export. The architecture separates public playback from authenticated content authoring.

Browser automation verified live data, presets, cue edits, download, empty state, API fallback and widths320/393/768/1440 in Chromium. This is not a claim of testing physical phones, Safari, all assistive technologies or perceptual sound quality.
