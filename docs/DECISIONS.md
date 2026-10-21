# Decisions

Newest first. Each entry: date, decision, options considered, reason. Changes to design pillars need owner approval.

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
