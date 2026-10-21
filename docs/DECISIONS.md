# Decisions

Newest first. Each entry: date, decision, options considered, reason. Changes to design pillars need owner approval.

## D-011 — 2026-10-21 — Roster v3 adopted
- **Decision:** units follow Atoms vs Bits. Humans: Field Engineer, Counter-Drone Team, Red Team, Armored Response Vehicle. AI (hijacked machines): Maintenance Drone, Botnet Swarm, Hunter Drone, Industrial Robot. The physical wall is a Barricade. Firewall, Exploit, Daemon, remote takeover and fiber cutting move to the Phase 3 network layer. The AI is "The Model" and the region is a fictional metro for pre-release testing. All subject to change after testing.
- **Reason:** code units walking around and getting shot contradicted the world framing (D-010). Roles and stats are unchanged, so balance work carries over.

## D-010 — 2026-10-21 — World framing "Atoms vs Bits" and the breakout premise
- **Decision:** the map is a physical metro region with a network layer drawn on top. Humans act physically; the AI lives in the network and acts physically only through machines it hijacks. Premise: a frontier model breaks containment; humans must contain it before it exfiltrates. If containment fails, it escalates into a resource war. See `docs/NARRATIVE.md`.
- **Options:** Atoms vs Bits; pure cyberspace; physical only.
- **Reason:** owner found the premise conflated (code units walking around, people shooting software). Atoms vs Bits keeps every existing grounded mechanic (power, fiber, Pull the Plug, containment/exfiltration) and gives each side exactly what the other lacks.
- **Pending:** roster v3 and network-layer mechanics (NARRATIVE §6) need owner approval; tone is a provisional default.

## D-009 — 2026-10-21 — Docs review: architecture, fairness, balance, governance
- **Decisions:**
  - Layered command API (unit orders + high-level orders) open to every controller; humans can use high-level orders as automation.
  - Non-human controllers: APM cap + reaction delay; LLM decisions apply a measured number of ticks after the request.
  - Sim uses integer/fixed-point math only; commands tick-stamped; game + data version stamped on replays, saves, memory, lore.
  - Faction signatures (simple versions) move into Phase 1; Adaptation gets a cap, decay, and recent-deaths window.
  - Balance harness adds strategy bots, a skill test, and symmetric test maps; data-driven map format in Phase 1.
  - Phase 3 terms re-grounded: rack heat, router traffic interception, link cuts, grid instability (rolling blackouts) as anti-stalemate.
  - Alternate victories Containment / Exfiltration approved.
  - Governance: small-PR rule, CODEOWNERS, DCO sign-off, branch protection + DCO check at go-public, CI performance budget.
  - LLM chat can never trigger commands; output filter for public builds.
  - Phase 4 adds accessibility and opt-in match stats; save/load snapshots in Phase 3; name/trademark check before going public.
- **Reason:** owner-approved review of all docs against the five tenets; fixing architecture now is far cheaper than after Phase 1 code exists.

## D-008 — 2026-10-21 — Five design tenets adopted
- **Decision:** `docs/TENETS.md` is the project charter: AI integration by design; human UI + LLM control surface in one package; test-driven; balance is critical; many paths to victory with strategy memory and lore.
- **Consequences:** CI moves to the start of Phase 1; a single command API for UI, scripted AI and LLM; all stats in one data file; duel-matrix balance harness in Phase 1; alternate victories and strategy memory in Phase 3.
- **Reason:** owner's core intent for the project.

## D-007 — 2026-10-21 — Gate 0 passed: Core Pillars v2 approved
- **Decision:** `docs/PILLARS.md` v2 approved. Pull the Plug vs Adaptation as faction signatures; hybrid economy (data streams over links, workers claim sources and build/repair links); Power as cap, Compute as production speed, Bandwidth as link capacity; play-as-AI deferred to Phase 3+; unit names kept as drafts.
- **Options (economy):** data flows over links; workers carry data (classic AoE); hybrid.
- **Reason:** hybrid stays grounded (data really moves over networks) while keeping plenty of worker activity. Signatures mirror the real debate on AI and society: the off-switch vs a system that learns faster than we respond.

## D-006 — 2026-10-21 — Grounding rule for all terminology
- **Decision:** every in-game term and mechanic must behave like its real-world counterpart. Deviations are marked "stretch" in `docs/PILLARS.md` and need owner approval.
- **Reason:** owner wants the cyber world to feel real, not a sci-fi reskin. Example: a router forwards traffic and is passive, so it is a capturable junction, not a resource mine.

## D-005 — 2026-10-21 — Contributors use any coding agent; no pluggable AI opponents
- **Decision:** "Any agent" means contributors build the game with whatever coding agent they prefer. AI opponents are not a community plug-in surface.
- **Options:** pluggable "bring your own General" protocol and arena; agent-agnostic development only.
- **Reason:** owner's intent is a shared, fun creation process, not an AI-bot competition platform.

## D-004 — 2026-10-21 — Repo private until Gate 1, then public
- **Options:** public from Phase 0; after Gate 1; after Gate 2.
- **Reason:** visitors arrive to something playable plus a clear roadmap, while still early enough to join the journey.

## D-003 — 2026-10-21 — MIT license for code
- **Options:** MIT, Apache-2.0, GPL-3.0.
- **Reason:** lowest friction for contributors; keeps a future commercial release possible. Original assets will be CC-BY-4.0.

## D-002 — 2026-10-21 — TypeScript + PixiJS, browser-first
- **Options:** Unity (C#), Godot 4, web/TypeScript.
- **Reason:** code is mostly agent-written; a text-only stack can be built and tested fully from the terminal by any agent; playtests are a shareable link; LLM calls are plain HTTP; headless sim runs in Node. Steam later via Tauri/Electron.
- **Revisit if:** 300 units cannot hold 60 fps at Gate 1 (fallback: Godot).

## D-001 — 2026-10-21 — Scope for first playable
- **Decision:** single player vs AI; 15–25 min matches; 2 epochs; no multiplayer before Gate 4.
- **Reason:** prove the core loop is fun before adding long sieges, more epochs, or netcode.
