# Cyberwar RTS — Strategy & Roadmap

Source: `Architecting a Cyber-Themed LLM RTS.pdf` (Gemini conversation, 2026-10-21).
Owner constraints: light coding (Claude writes most code), <10 hrs/week, solo, end goal undecided.

## 0. Tenets

`docs/TENETS.md` is the project charter: (1) AI integration by design, (2) human UI and LLM control surface in one package, (3) test-driven, (4) balance is critical, (5) many paths to victory and strategies that live on. Everything below serves those.

## 1. Strategy

**Core bet:** the hook is the opponent, not the setting. An LLM "General" that plans, adapts, bluffs, and taunts you is what makes this different from a sci-fi StarCraft reskin. Everything else (cyber theme, epochs, sieges) supports that.

**Principles**

1. **Prove fun before scope.** Greybox loop first. No art, no lore, no multiplayer until the loop is fun.
2. **Simulation separate from rendering.** A deterministic, headless game simulation lets us (a) test without a screen, (b) run thousands of AI-vs-AI matches for balance, (c) benchmark LLM Generals objectively.
3. **LLM = High Command only.** Three tiers as the PDF describes: LLM strategy every 15–30 s, scripted operational layer every ~1 s, per-tick unit micro. LLM output is schema-constrained and validated; scripted fallback when invalid or slow.
4. **Asymmetry reduces work.** Human faction is player-controlled. AI faction is only ever controlled by the AI, so it needs no player UI at first.
5. **Small, cheap decisions; expensive ones gated.** Each phase ends at a gate with explicit criteria.
6. **Open source, built in the open with any coding agent.** Public repo (MIT) where anyone can help build the game using whatever coding agent they prefer (Claude Code, Codex, Cursor, Copilot, Aider, or none) at any skill level. Building the game together is meant to be fun in itself.

**Open-source plan**

- **License:** MIT for code. Original art/audio: CC-BY-4.0 (decided when first original assets land). Third-party assets only if CC0/MIT-compatible (Kenney.nl is CC0).
- **Visibility:** private until Gate 1, public right after. Visitors find a playable greybox, a roadmap, and good-first-issues.
- **Works with any coding agent:** one tool-agnostic `AGENTS.md` (architecture, conventions, commands, do/don't) is the single source of truth. Thin per-tool pointer files (`CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, etc.) only say "read AGENTS.md". No contributor needs a specific agent.
- **Easy for agents to check their own work:** small modules, fast tests, and two commands that answer "does it work": `npm test` and `npm run sim`. The headless sim lets an agent check gameplay changes without a screen.
- **Issues sized for one agent session:** each issue has context, acceptance criteria, and the files involved, so a contributor can hand it straight to their agent. Labels: `good first issue`, `design`, `ai-opponent`, `art`, `agent-friendly`.
- **The making-of is part of the fun:** `docs/JOURNAL.md` dev log of milestones, decisions, and surprises (including agent wins and failures). PR template has an optional "agent used / how it went" field so the community can compare workflows.
- **Contribution flow:** PR template, CI runs tests + determinism check + short sim batch on every PR. Design changes go through `docs/DECISIONS.md` via PR.
- **Hygiene:** no secrets in repo (`.env` gitignored, keys only via local proxy config); commits use a GitHub noreply email; owner stays final approver on pillar/design changes.
- **Steam stays possible:** MIT code can be sold; paid builds may bundle assets under separate terms.

**Scope cuts vs. the PDF (for now)**

| PDF idea | Status | Why |
|---|---|---|
| 60–120 min sieges | Deferred to Phase 3 | Target 15–25 min matches until the loop is fun. Long matches multiply balance work. |
| Co-op multiplayer | Deferred to Phase 5 | Netcode is the single largest cost in RTS dev. |
| 4 epochs | Start with 2 | Add epochs once 2 feel distinct. |
| LLM rewrites unit params mid-match | Phase 3 stretch | Needs a stable balance baseline first. |
| Unity engine | Replaced (see §2) | Fits a pro team; poor fit for Claude-driven solo dev. |

**PDF claims to verify (not trust):** ">95% tool-call reliability", "<$0.02 per match", specific model names/versions, "<1.5 s turns". Phase 2 measures these on our own harness.

## 2. Platform Decision

**Choice: TypeScript, browser-first. PixiJS for 2D rendering, pure-TS simulation core, Vite build.** Desktop/Steam later via Tauri or Electron wrapper.

| Criterion | Web/TS (chosen) | Godot 4 | Unity 6 |
|---|---|---|---|
| Claude can write, run, test entirely from terminal | Strong | Medium (text scenes, headless mode) | Weak (editor-bound scenes/prefabs) |
| Share a playtest build | Link | Web export / download | Download |
| LLM bridge (HTTP to Ollama/cloud) | Trivial (`fetch`) | Easy | Easy |
| Headless sim for batch AI matches | Native (Node) | Possible | Awkward |
| Unit-count ceiling | ~300–500 (2D, worker thread) | High | Highest |
| Steam path | Tauri/Electron (proven: Vampire Survivors started as web tech) | Native | Native |
| License risk | None | None | Runtime-fee history |

**Known risk:** perf ceiling and no visual editor. **Re-evaluation trigger:** at Gate 1, if 300 units cannot hold 60 fps, port the renderer to Godot (sim logic ports with it as a design, not code).

**Art direction:** top-down 2D. Avoid the "Tron trap": distinct silhouettes per role, readable color coding, not all neon-on-black.

## 3. Resources & Tools

**Already installed:** Node.js, git, Python 3.12, .NET SDK. Hardware: RTX 3090 (24 GB) + RTX 3080 Ti (12 GB), 64 GB RAM, Threadripper 3970X — ideal for the PDF's dual-GPU setup (one card renders, one runs the LLM).

| Need | Tool | Phase | Cost |
|---|---|---|---|
| Version control + backup | git + private GitHub repo | 0 | Free |
| Language / build / tests | TypeScript, Vite, Vitest | 0 | Free |
| Rendering | PixiJS v8 | 1 | Free |
| Pathfinding | Own grid A* + flow fields (no dependency) | 1 | Free |
| Local LLM runtime | Ollama (structured JSON output) — pin to 3080 Ti via `CUDA_VISIBLE_DEVICES` | 2 | Free |
| Local models | Bake-off: ~8B, ~14B, ~32B instruct models with strong tool calling (Qwen/Gemma class) | 2 | Free |
| Cloud LLM (optional "Frontier" difficulty) | Claude API key (Haiku/Sonnet tier) via small local proxy so the key never ships in browser code | 2–4 | Pay-per-use |
| Placeholder art | Kenney.nl asset packs, simple vector shapes | 1–3 | Free |
| SFX | jsfxr | 3 | Free |
| Playtest distribution | itch.io (private link) | 3+ | Free |
| Playtester community | Small Discord server | 3+ | Free |
| Desktop packaging | Tauri or Electron | 5 | Free |
| Steam | Steamworks fee | 5 | $100 |

## 4. Phases, Milestones & Gates

Timeboxes assume ~8 hrs/week. Overrunning a timebox by 50% triggers an owner review.

### Phase 0 — Foundation (1–2 weeks)
- M0.1 git repo (noreply author email) + private GitHub remote; Vite/TS/Vitest scaffold; folder layout `sim/`, `render/`, `ai/`, `docs/`.
- M0.1b Open-source skeleton: `LICENSE` (MIT), `README.md`, `AGENTS.md` + per-tool pointer files, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.gitignore` (incl. `.env`), `docs/DECISIONS.md`, `docs/JOURNAL.md`.
- M0.2 **Core Pillars sheet** (1 page): 3 resources, 3 units per faction (rock-paper-scissors), win condition, target match length, the AI faction's signature mechanic.
- **Gate 0 (owner sign-off):** pillars approved.

### Phase 1 — Greybox Core Loop (4–6 weeks)
- M1.0 CI (GitHub Actions): typecheck, tests, determinism, short sim batch on every push/PR.
- M1.1 Deterministic sim: fixed tick (20 Hz), seeded RNG, map grid, units, resources. All unit/building numbers in one data file.
- M1.1b Command API + text view: every action is a command; the sim exposes a text summary of state. Replays = seed + command log. (Tenet 2, 3)
- M1.2 Render + input: box select, right-click move, camera pan/zoom. The UI only issues commands through the command API.
- M1.3 Economy (hybrid, per `docs/PILLARS.md`): workers claim Data Sources and build links; data streams home capped by link bandwidth; Power cap from substations; Compute from racks sets build speed; spend Data to spawn.
- M1.4 Combat: 3 unit types with counters; units die.
- M1.5 Scripted AI opponent (behavior tree / build order), issuing commands through the same command API.
- M1.6 Headless runner: `npm run sim -- --matches 100` prints win rates.
- M1.7 Balance harness: equal-cost duel matrix for every unit pair (`npm run balance`). (Tenet 4)
- **Gate 1 criteria:**
  - Owner plays 5+ matches and answers "do I want to play again?" yes.
  - 300 units at 60 fps on the dev machine.
  - Same seed + same inputs = identical result (determinism test passes).
  - Headless 20-min match runs in <10 s.
  - Duel matrix: each counter wins ≥70% of equal-cost fights against its target; no unit has a positive record against every other.
  - A recorded match replays to an identical final state.
- **Go-public step (after Gate 1 passes, owner approval):** issue templates, 5–10 `good first issue`s, secrets/history scan, flip repo to public, announce (owner's call on where).

### Phase 2 — The LLM General (4–6 weeks)
- M2.1 State digest: sim → ~400-token JSON summary by named sector, with pre-computed threat levels.
- M2.2 Command schema: 10–15 high-level tools (`set_economy_focus`, `attack_sector`, `research`, `taunt`…), enforced via structured output.
- M2.3 Validator + fallback: invalid/late command → scripted behavior for that cycle; all calls logged.
- M2.4 `AICommanderClient` provider switch: Ollama local / cloud via proxy.
- M2.5 In-game comms: General's taunts/bluffs in a chat panel.
- M2.6 Model bake-off: run batch matches per model size; record win rate vs scripted AI, invalid-command rate, p95 latency, VRAM, cost.
- **Gate 2 criteria:**
  - Best local model beats scripted AI in ≥55% of headless matches.
  - Invalid-command rate <2%; p95 decision latency <3 s.
  - Owner blind test: LLM General feels noticeably different from scripted AI.
  - **Owner decision:** default model tier and whether cloud mode is in scope.

### Phase 3 — Depth & Identity (6–10 weeks)
- M3.1 AI faction asymmetry: "Base Model" learns from losses (next wave resists what killed the last).
- M3.2 Map mechanics: compute-node heat/throttling, router junctions (throttle/siphon), destructible memory blocks.
- M3.3 Epochs I–II, then III–IV if distinct.
- M3.4 Siege layer: nested subnets, bandwidth chokes, counter-attack vectors, defrag-cycle anti-stalemate.
- M3.5 Comeback mechanic (AI fringe latency/power draw).
- M3.7 Alternate victories (Containment / Exfiltration, once approved) + balance sims proving every path is viable. (Tenet 5)
- M3.8 Strategy memory: the General's readable playbook persists across matches. Lore codex: named strategies + shareable replays. (Tenet 5)
- M3.6 External playtests: 3–5 people via itch.io private link + short survey.
- **Gate 3 criteria:**
  - Batch sims show no single build order winning >65%.
  - Every victory path wins at least 15% of sim matches where a strategy pursues it.
  - Playtesters: ≥3 of 5 would play again; average session > 2 matches.
  - **Owner decision:** match-length target (short skirmish vs long siege mode).

### Phase 4 — Vertical Slice (6–8 weeks)
- M4.1 Art direction pass (readable silhouettes, role colors), UI/HUD, audio.
- M4.2 Onboarding/tutorial vs "Edge Node AI".
- M4.3 Difficulty ladder = model tier (Edge Node 8B / Datacenter 32B / Frontier cloud).
- M4.4 Public itch.io demo; collect feedback, track plays.
- **Gate 4 — the big owner decision:** Go Steam / Stay free-web / Keep as hobby / Stop. Inputs: demo plays, feedback, retention, owner appetite.

### Phase 5 — Production (conditional on Gate 4)
- Desktop wrap, Steam page + wishlists, bundled-vs-sidecar LLM install story, content (maps, campaign), optional co-op PvE (requires netcode plan).

## 5. Decision Framework

Every gate ends with one of four outcomes:

| Outcome | When | Action |
|---|---|---|
| **Go** | All criteria met | Start next phase. |
| **Iterate** | Criteria close; clear fix exists | One more timeboxed cycle (≤50% of phase timebox). |
| **Pivot** | Core assumption failed (e.g., loop not fun after 2 iterations, LLM no better than scripts) | Change one pillar, re-run the gate. |
| **Stop/Park** | Two pivots failed or owner interest gone | Archive with notes. |

Rules:
- Decisions recorded in `docs/DECISIONS.md` (date, decision, options, reason).
- Measurable criteria decided by data (sim batches, logs). Fun/taste criteria decided by the owner.
- Scope additions mid-phase go to a backlog, not the current phase.

## 6. Owner Involvement Points

Claude works autonomously between these; owner is pulled in at:

1. Gate 0 — approve Core Pillars.
2. Any purchase or paid API key / account creation.
3. Gate 1 — play the greybox, judge fun.
4. Gate 2 — blind test LLM vs scripted; pick model tier; cloud mode yes/no.
5. Gate 3 — match length and siege direction; recruit playtesters.
6. Gate 4 — commercial direction.
7. Any timebox overrun >50%, or a platform re-evaluation trigger.
8. Anything public: itch.io release, store pages, posts, flipping the repo public.
9. Merging outside PRs that change design pillars or licensing.

## 7. Top Risks

| Risk | Mitigation |
|---|---|
| Scope explosion (RTS is a huge genre) | Gates + backlog; no multiplayer before Gate 4. |
| Loop not fun | Fail fast at Gate 1; pivot unit/resource pillars. |
| LLM General not better than scripts | Gate 2 measures it; scripted AI remains a shippable fallback. |
| Player hardware can't run local LLM | Provider switch + small-model tier + cloud option. |
| Browser perf ceiling | 2D, sim in Web Worker, unit cap; Godot re-evaluation trigger. |
| Snowballing / stalemates | Batch-sim balancing; comeback and defrag mechanics in Phase 3. |
| Theme unreadability ("Tron trap") | Silhouette/color rules from Phase 1 greybox onward. |
| Secret or personal data leaks once public | `.gitignore`, noreply email, history scan before going public. |
| Contributor PRs drift from vision | Pillars doc + DECISIONS.md + owner approval on design PRs; CI gates quality. |
