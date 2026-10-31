# ✦ Constellations

An interactive knowledge map powered by **Gemma 4**, running locally through **Ollama**.

Type a subject (e.g. *Biology*) and Gemma 4 generates a "constellation" of about seven related concepts. Each subject is a coloured hub, each concept is a star linked to it. Concepts that belong to more than one subject (Biochemistry between Biology and Chemistry, Bioinformatics between Biology and Computer Science) are drawn as **glowing white stars** where the constellations overlap.

> Built for the Hacktoberfest Hack Day, **Best Open-Source AI Project** challenge.

---

## Table of contents

1. [What it does](#1-what-it-does)
2. [Tech stack](#2-tech-stack)
3. [Prerequisites](#3-prerequisites)
4. [Team setup (do this first)](#4-team-setup-do-this-first)
5. [Architecture](#5-architecture)
6. [Build plan, step by step](#6-build-plan-step-by-step)
7. [Prompts and JSON contracts](#7-prompts-and-json-contracts)
8. [Work split for three people](#8-work-split-for-three-people)
9. [Prize checklist](#9-prize-checklist)
10. [Open decisions](#10-open-decisions)

> **Note:** This file is the working plan. Before submitting, replace sections 4 to 10 with the final "How to run" and "Model and licence" sections (see the prize checklist).

---

## 1. What it does

| Action | Result |
|---|---|
| Enter a subject | Gemma 4 returns ~7 concepts; a hub and its stars appear |
| Click a subject hub | Expand or collapse that subject's concepts and show their descriptions |
| Add a second subject | A second constellation appears; any concept that appears in both becomes a **shared (white, glowing) star** |
| Select two subjects and press **Discover Connections** | Gemma explains where the fields intersect and adds a **bridge concept** with a few sub-concepts between the two clusters |

---

## 2. Tech stack

All C#, one solution, one language for the whole team.

| Layer | Choice | Why |
|---|---|---|
| Runtime | .NET 8 (LTS) or newer | Everyone can install it on any OS |
| UI | **Blazor Server** with SVG rendering | No JavaScript build step, easy glow effects via SVG filters, C# end to end |
| AI client | [OllamaSharp](https://github.com/awaescher/OllamaSharp) (NuGet) | Typed C# client for the Ollama API. Fallback: plain `HttpClient` against `http://localhost:11434` |
| Model | **Gemma 4** via Ollama | Open-weight, runs locally |
| Layout | Small force-directed layout written by us in C# | Keeps hubs apart and pulls shared stars between their parents |
| Tests | xUnit | For graph merging and JSON parsing |

**Model licence:** Gemma 4 was released under Apache 2.0 according to the reports we found. Before submitting, **check the model card / Ollama page yourself** and link the exact licence in the README. Also note Ollama itself is MIT licensed.

---

## 3. Prerequisites

Everyone installs:

- [.NET SDK 8+](https://dotnet.microsoft.com/download) (`dotnet --version`)
- [Git](https://git-scm.com/) and a GitHub account
- [Ollama](https://ollama.com/download) (`ollama --version`)
- An IDE of choice (Visual Studio, Rider, VS Code with C# Dev Kit) and optionally an AI coding agent

Pull a Gemma 4 model:

```bash
ollama pull gemma4:e4b     # small, good default for laptops
# or, if your hardware allows:
ollama pull gemma4:12b
```

Check the available tags at `ollama.com/library/gemma4` and sizes with `ollama list`. **Agree on one model tag as a team** so everyone sees the same output, and make it configurable (see step 3 below).

> ⚠️ **Context window gotcha:** Ollama may default Gemma 4 to a small context window (reported as 4K). Our prompts are short, but set `num_ctx` explicitly in the request options so behaviour is predictable.

Smoke test:

```bash
ollama run gemma4:e4b "List 7 sub-fields of Biology as a comma-separated list."
```

---

## 4. Team setup (do this first)

One person does steps 1 to 4, the rest clone.

1. **Create the repo** on GitHub: `constellations`, **public**, add a `.gitignore` (Visual Studio / .NET template) and the **licence** (Apache-2.0 or MIT; a public repo without a licence does not qualify for the prize).
2. **Add collaborators** (Settings → Collaborators) for the other two members.
3. **Protect `main`** (optional but useful): require pull requests, no direct pushes.
4. **Scaffold the solution** and push:

   ```bash
   dotnet new sln -n Constellations
   dotnet new blazor -n Constellations.Web -int Server -o src/Constellations.Web
   dotnet new classlib -n Constellations.Core -o src/Constellations.Core
   dotnet new xunit -n Constellations.Tests -o tests/Constellations.Tests
   dotnet sln add src/Constellations.Web src/Constellations.Core tests/Constellations.Tests
   dotnet add src/Constellations.Web reference src/Constellations.Core
   dotnet add tests/Constellations.Tests reference src/Constellations.Core
   dotnet add src/Constellations.Core package OllamaSharp
   ```

   > Template flags change between SDK versions. If `-int Server` is rejected, run `dotnet new blazor --help`.

5. **Workflow:** short-lived branches (`feat/ollama-service`, `feat/graph-merge`, `feat/svg-view`), small PRs, one reviewer each. Commit early and often, since judges look for substantial work by the team.

Suggested layout:

```
constellations/
├── src/
│   ├── Constellations.Core/      # models, Ollama service, graph merge, layout
│   └── Constellations.Web/       # Blazor UI (SVG canvas, side panel)
├── tests/Constellations.Tests/
├── docs/                         # screenshots / demo GIF
├── LICENSE
└── README.md
```

---

## 5. Architecture

```
 Blazor UI (SVG)  ──►  ConstellationService  ──►  OllamaClient  ──►  Ollama (localhost:11434) ──► Gemma 4
       ▲                     │
       │                     ▼
   LayoutEngine  ◄──────  GraphModel (subjects, concepts, links, shared flag)
```

Core types (in `Constellations.Core`):

```csharp
public record Subject(string Id, string Name, string Colour);

public class Concept
{
    public string Id { get; init; }          // normalised name, e.g. "biochemistry"
    public string Name { get; init; }        // display name
    public string Description { get; set; } = "";
    public HashSet<string> SubjectIds { get; } = new();
    public bool IsShared => SubjectIds.Count > 1;   // drawn white + glowing
    public bool IsBridge { get; set; }               // created by Discover Connections
}
```

**Overlap rule:** concepts are keyed by a *normalised name* (trim, lowercase, strip punctuation, collapse simple plurals). If a concept from a new subject has the same key as an existing one, add the new subject to `SubjectIds` instead of creating a duplicate. That is what makes the glowing intersections appear.

---

## 6. Build plan, step by step

### Step 1: Prove the AI loop (console first)
- In `Constellations.Core`, write `OllamaClient` with `GenerateConceptsAsync(string subject)`.
- Use Ollama **structured outputs**: pass a JSON schema in the request's `format` field so the model returns valid JSON only.
- Set `temperature` low (0.2 to 0.4) and set `num_ctx`.
- Test from a tiny console app or xUnit test with the input `Biology` and print the result.
- **Done when:** the same call returns parseable JSON with ~7 concepts reliably.

### Step 2: Graph model and merging
- Implement `GraphModel` with `AddConstellation(subject, concepts)` using the overlap rule above.
- Unit-test: add *Biology* and *Chemistry* where both include "Biochemistry", then assert one concept with two `SubjectIds`.
- Add name normalisation tests ("Cell Biology" vs "cell biology", "Algorithm" vs "Algorithms").
- **Done when:** merging is deterministic and tested.

### Step 3: Configuration
- `appsettings.json`: `Ollama:BaseUrl` (default `http://localhost:11434`), `Ollama:Model` (e.g. `gemma4:e4b`), `Ollama:NumCtx`.
- Register services with dependency injection in `Program.cs`.

### Step 4: Static visual with fake data
- Build the Blazor SVG component `ConstellationCanvas.razor` using hard-coded sample data first (Biology, Chemistry, Computer Science).
- Draw: dark space background, hubs as large coloured circles, stars as small circles, lines from hub to star.
- SVG glow: define a `<filter>` with `feGaussianBlur` and apply it to shared stars (white fill).
- **Done when:** the three sample subjects display with glowing white stars at the intersections.

### Step 5: Layout engine
- Implement a simple force simulation in C#: repulsion between all nodes, spring attraction along links, a weak centre pull.
- Shared stars are linked to **all** their hubs, so the springs naturally place them between clusters.
- Run ~200 iterations on each change, then animate by lerping to the new positions (or tick on a timer).
- **Done when:** adding a subject does not make the existing map jump around wildly.

### Step 6: Wire the UI to Gemma
- Input box and **Add subject** button call `ConstellationService.AddSubjectAsync`.
- Show a loading state (local models can take several seconds) and handle failures (Ollama not running, model missing, bad JSON → one retry, then a friendly error).
- Assign each subject a colour from a fixed palette.
- **Done when:** typing *Biology*, then *Chemistry*, produces a live map with Biochemistry glowing, if Gemma returns it.

### Step 7: Click-to-expand
- Clicking a subject hub toggles its stars visible/collapsed and opens a side panel with the concept descriptions.
- (Optional, see open decisions) Double-clicking a concept star promotes it to its own subject and asks Gemma for its sub-concepts.

### Step 8: Discover Connections
- Let the user select exactly two hubs (click + shift-click or checkboxes). Enable the **Discover Connections** button only when two are selected.
- Call `DiscoverConnectionAsync(subjectA, subjectB)`, which returns an explanation, one bridge concept and ~3 sub-concepts.
- Add the bridge concept with `SubjectIds = {A, B}` and `IsBridge = true`, attach the sub-concepts to the bridge, then re-run the layout.
- Show Gemma's explanation in the side panel.
- **Done when:** selecting *Biology* + *Computer Science* adds *Bioinformatics* (or similar) between the clusters with its sub-concepts.

### Step 9: Polish
- Hover tooltips, subtle twinkle animation, zoom/pan, a **Clear** button, and an **Export JSON / Import JSON** option so the demo does not depend on a live model call.
- Pre-warm the model on app start (a tiny generate call) so the first demo click is fast.
- Cache results per subject during the session.

### Step 10: Demo and submission prep
- Record a short GIF/screenshot for `docs/`.
- Rehearse the demo: Biology → Chemistry → Computer Science → Discover Connections (Biology + Computer Science).
- Write the final README (see the prize checklist) and submit.

---

## 7. Prompts and JSON contracts

**Generate concepts** (system + user):

```text
System: You are a knowledge-map generator. Reply with JSON only, matching the schema.
User:   Subject: "{subject}"
        List exactly 7 major concepts or sub-fields of this subject.
        Use short, canonical, Title Case names (e.g. "Cell Biology", not "the study of cells").
        For each, add a one-sentence description.
        Prefer the commonly used name for any concept that also belongs to other fields.
```

Schema:

```json
{
  "type": "object",
  "properties": {
    "concepts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" }
        },
        "required": ["name", "description"]
      }
    }
  },
  "required": ["concepts"]
}
```

**Discover connection:**

```text
User: Subjects: "{A}" and "{B}".
      Explain in 2 to 3 sentences where these two fields intersect.
      Then give ONE bridge concept that belongs to both (canonical Title Case name, one-sentence description)
      and exactly 3 sub-concepts of that bridge concept.
```

Schema returns: `{ "explanation": "...", "bridge": { "name": "...", "description": "..." }, "subConcepts": [ { "name": "...", "description": "..." } ] }`.

Tips:
- Validate the output in C# (non-empty names, de-duplicate, cap counts) rather than trusting the model.
- If results vary too much between runs, lower the temperature or add a fixed `seed` in the Ollama options.

---

## 8. Work split for three people

| Person | Focus | Steps |
|---|---|---|
| **A: AI** | Ollama client, prompts, schemas, validation, retries, config | 1, 3, 6 (service side), 8 (service side) |
| **B: Graph and layout** | Models, normalisation, merging, force layout, tests, JSON import/export | 2, 5, 9 (export) |
| **C: UI and demo** | Blazor SVG canvas, glow, interactions, side panel, README, demo assets | 4, 7, 8 (UI side), 9, 10 |

Agree the interfaces in the first 30 minutes (`IConstellationAi` with `GenerateConceptsAsync` and `DiscoverConnectionAsync`, and the `GraphModel` public API). C can then build against a **fake** `IConstellationAi` returning sample data while A finishes the real one.

Suggested rhythm: scaffold together → work in parallel on steps 1, 2 and 4 → integrate at steps 6 to 8 → everyone tests and polishes → rehearse the demo twice.

---

## 9. Prize checklist

Based on the Best Open-Source AI Project rules:

- [ ] Open-weight AI is central to the app (Gemma 4 generates all concepts and connections)
- [ ] Public GitHub repository
- [ ] `LICENSE` file present (open-source licence)
- [ ] README explains **what we built**, **how to run it**, and **which model and key dependencies** we used
- [ ] README **names the model and links its licence/terms** (Gemma 4 and Ollama)
- [ ] Someone outside the team can clone, follow the README and run it
- [ ] Working demo ready, and the team can explain what we built during the event
- [ ] Submitted by one member via the event's **OrganizerHQ Challenges** page before the host's deadline, with repo URL, project name, description, technologies and demo URL (if any), selecting **Best Open-Source AI Project**

Final README should include at least: description + screenshot, requirements, install steps (`ollama pull ...`, `dotnet run`), configuration, model and licence links, dependency list (.NET, Blazor, OllamaSharp, Ollama), and a short "How it uses AI" section.

---

## 10. Open decisions

Settle these early:

1. **Model tag:** `gemma4:e4b` vs `gemma4:12b` (speed vs quality on the demo machine).
2. **Click-to-expand meaning:** toggle a hub's visible stars, or also promote a star into its own hub (recommended: both, with double-click for promotion).
3. **Subject limit:** cap at ~5 subjects on screen to keep the map readable.
4. **Licence:** Apache-2.0 or MIT.
5. **Demo fallback:** keep an exported JSON of the demo map in case Ollama misbehaves on stage.
