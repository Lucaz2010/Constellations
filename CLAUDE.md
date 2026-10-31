# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this repository.

## What we are building

**Constellations** is an interactive knowledge map. The user types a subject (e.g. *Biology*) and **Gemma 4, running locally through Ollama**, generates ~7 related concepts. Each subject is a coloured **hub**, each concept a **star** linked to it. Concepts that belong to more than one subject (e.g. *Biochemistry* between Biology and Chemistry) are drawn as **glowing white shared stars** where constellations overlap.

Core features:
1. **Add subject** → Gemma returns ~7 concepts; hub + stars appear.
2. **Click a hub** → expand/collapse its stars and show concept descriptions in a side panel.
3. **Add more subjects** → concepts with the same normalised name merge into one shared star.
4. **Discover Connections** (exactly two hubs selected) → Gemma explains the intersection and adds a **bridge concept** with ~3 sub-concepts between the clusters.

Built for the Hacktoberfest Hack Day **Best Open-Source AI Project** challenge. The open-weight model must be central to the app, so **do not add cloud LLM providers** (Gemini, OpenAI, etc.) as the primary path.

`README.md` is the working plan and the source of truth for the design. Read it before larger changes.

## Current repo state (important)

The plan is **C# / .NET + Blazor**. The repo currently also contains a **TypeScript prototype** exported from Google AI Studio (`server.ts`, `src/*.tsx`, `package.json`, `vite.config.ts`, `index.html`, `metadata.json`, `bun.lock`, `.env.example`, `public/assets/aistudio/`). That prototype defaults to Gemini cloud and is **not** the target stack.

- Do not extend the TypeScript prototype. Use it only as a reference for UX ideas and prompt wording.
- The .NET solution is scaffolded (template code only: `Class1.cs`, `UnitTest1.cs`, Counter/Weather pages). Replace the placeholders as real code lands.
- Removing or moving the prototype is a team decision. Ask before deleting it.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | **.NET 10 (LTS)**: all projects target `net10.0`, and `global.json` pins SDK 10.0.x (`rollForward: latestFeature`) |
| UI | Blazor Server (interactive server render mode), rendering with **SVG** (no JS build step) |
| AI client | [OllamaSharp](https://github.com/awaescher/OllamaSharp). Fallback: plain `HttpClient` against `http://localhost:11434` |
| Model | Gemma 4 via Ollama (default tag `gemma4:e4b`, configurable) |
| Layout | Custom force-directed layout in C# |
| Tests | xUnit |

## Project layout

```
Constellations.slnx       # .NET 10 XML solution format (not .sln)
global.json               # pins the .NET 10 SDK
src/
  Constellations.Core/    # models, IConstellationAi + Ollama impl, GraphModel, normalisation, LayoutEngine
  Constellations.Web/     # Blazor UI: ConstellationCanvas.razor (SVG), side panel, Program.cs DI
tests/
  Constellations.Tests/   # xUnit: graph merge, normalisation, JSON parsing/validation, layout sanity
docs/                     # screenshots / demo GIF
LICENSE
README.md
```

`Constellations.Core` must not depend on Blazor/ASP.NET. Keep the UI thin.

## Prerequisites

- **.NET 10 SDK** (`dotnet --version` should print `10.0.x`). Older SDKs fail because of `global.json` and `net10.0`.
- Ollama with a Gemma 4 model pulled (see below).

## Adding projects or packages

The solution already exists. Don't re-scaffold it. To add to it:

```bash
dotnet new classlib -n Constellations.Something -o src/Constellations.Something
dotnet sln Constellations.slnx add src/Constellations.Something
dotnet add src/Constellations.Core package <PackageName>
```

Keep new projects on `net10.0`. Never commit `bin/` or `obj/`; the root `.gitignore` covers them, and also covers secrets.

## Common commands

```bash
dotnet build
dotnet test
dotnet test --filter "FullyQualifiedName~GraphModel"   # single test class
dotnet run --project src/Constellations.Web             # http://localhost:5203
dotnet watch --project src/Constellations.Web          # hot reload

ollama pull gemma4:e4b
ollama list
ollama run gemma4:e4b "List 7 sub-fields of Biology as a comma-separated list."
```

## Architecture

```
Blazor UI (SVG) ──► ConstellationService ──► IConstellationAi (Ollama impl) ──► Ollama :11434 ──► Gemma 4
      ▲                    │
      │                    ▼
  LayoutEngine ◄──── GraphModel (subjects, concepts, links, shared flag)
```

Key contracts (agree before changing them; three people build against them in parallel):

- `IConstellationAi`
  - `GenerateConceptsAsync(string subject)` returns ~7 `{ name, description }` items.
  - `DiscoverConnectionAsync(string subjectA, string subjectB)` returns `{ explanation, bridge: { name, description }, subConcepts: [ { name, description } x3 ] }`.
  - Keep a **fake implementation** returning sample data so the UI can be built and demoed without Ollama.
- `GraphModel.AddConstellation(subject, concepts)`, plus adding bridge concepts.
- Core types: `Subject(Id, Name, Colour)` and `Concept` with `Id` (normalised name), `Name`, `Description`, `SubjectIds` (HashSet), `IsShared => SubjectIds.Count > 1`, `IsBridge`.

### Overlap rule (the heart of the app)
Concepts are keyed by a **normalised name**: trim, lowercase, strip punctuation, collapse whitespace, collapse simple plurals. When a new subject's concept matches an existing key, **add the subject to `SubjectIds`** instead of creating a duplicate. Merging must be deterministic and unit-tested (e.g. "Cell Biology" vs "cell biology", "Algorithm" vs "Algorithms", Biology + Chemistry sharing Biochemistry).

### Layout
Force simulation: repulsion between all nodes, spring attraction along links, weak centre pull. Shared stars and bridges link to **all** their hubs, so springs pull them between clusters. Run ~200 iterations per change and lerp to the new positions. Adding a subject must not make the existing map jump wildly (seed from current positions).

### Rendering
SVG on a dark background. Hubs are large coloured circles, stars small circles, with lines from hub to star. Shared stars are white and use an SVG `<filter>` glow (`feGaussianBlur`). Each subject takes a colour from a fixed palette. Cap at ~5 subjects on screen.

## Ollama / AI rules

- Use **structured outputs**: pass the JSON schema in the request `format` field. Schemas and prompts are in README §7. Keep them in sync if you change one.
- Set `temperature` low (0.2–0.4) and **always set `num_ctx` explicitly** (Ollama may default Gemma 4 to a small context). Add a fixed `seed` if runs vary too much.
- **Never trust model output**: validate in C# (non-empty names, de-duplicate, cap counts, trim descriptions).
- Failure handling: on bad JSON retry once, then show a friendly error. Detect "Ollama not running" and "model not pulled" and say so clearly in the UI.
- Show a loading state, since local generation can take several seconds. Pre-warm the model on startup and cache results per subject for the session.

## Configuration

`appsettings.json` (bind to an options class, register via DI in `Program.cs`):

```json
"Ollama": { "BaseUrl": "http://localhost:11434", "Model": "gemma4:e4b", "NumCtx": 4096 }
```

Never hard-code the model tag or URL. The app itself needs no API keys. If a secret is ever needed, it goes in `.env` (see "Secrets"), never in `appsettings.json`.

## Conventions

- C#: nullable reference types enabled, `async`/`await` end to end with `CancellationToken` on AI calls, records for immutable data, file-scoped namespaces.
- Put logic in `Core` with tests. Razor components only handle presentation and interaction.
- Add or update xUnit tests for any change to normalisation, merging, JSON parsing or validation.
- Conventional Commit messages (`feat:`, `fix:`, `docs:`, `test:`, `chore:` …).

## Git workflow (mandatory)

**NEVER commit or push directly to `main`, under any circumstances.** All changes go through a pull request.

1. Update main: `git checkout main && git pull`
2. Create a new feature branch from `main`: `git checkout -b feat/<short-name>` (or `fix/`, `docs/`, `test/`, `chore/`)
3. Commit on that branch, then push it: `git push -u origin <branch>`
4. Open a PR into `main` (`gh pr create --base main`) with one reviewer from the team.
5. Keep branches short-lived and PRs small. Delete the branch after merge.

If you find yourself on `main` with changes, move them to a new branch before committing. Never force-push to `main`.

## Secrets (NEVER expose them)

- Keep all secrets (API keys, tokens, passwords, connection strings) in **`.env` files**. They are git-ignored and must never be committed.
- Commit only **`.env.example`**, with placeholder values and a comment per variable explaining what it is.
- Never put secrets in `appsettings.json`, source code, tests, logs, commit messages, PR descriptions, issues or screenshots.
- Before every commit, check `git status` / `git diff --staged` and make sure no `.env`, key or credential file is staged.
- If a secret is ever committed or pushed, stop and tell the team right away. The secret must be rotated, because removing it from history alone is not enough.
- Don't weaken or remove the secret patterns in `.gitignore`.

## Team split (for context)

- **A: AI**: Ollama client, prompts, schemas, validation, retries, config.
- **B: Graph & layout**: models, normalisation, merging, force layout, tests, JSON import/export.
- **C: UI & demo**: SVG canvas, glow, interactions, side panel, README, demo assets.

## Submission requirements (don't break these)

- Public repo with a `LICENSE` file (Apache-2.0 or MIT, still to be decided).
- The final README must cover what we built, how to run it (`ollama pull …`, `dotnet run`), configuration, the model with a link to its licence (Gemma 4 and Ollama/MIT), dependencies, and a "How it uses AI" section. Before submitting, replace the planning sections (README §4–10).
- Someone outside the team must be able to clone the repo and run it from the README alone.
- Demo fallback: **Export/Import JSON** of a map so the demo doesn't depend on a live model call.

## Open decisions

Model tag (`gemma4:e4b` vs `gemma4:12b`), click-to-expand semantics (also double-click to promote a star to a hub?), subject cap, licence choice, and what to do with the TypeScript prototype. Don't settle these on your own. Ask.
