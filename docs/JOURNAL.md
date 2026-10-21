# Dev Journal

The story of building this game, newest first. Wins, failures, surprises, and what the agents did well or badly. Anyone can add an entry.

## 2026-10-21 — Day zero

- Started from a brainstorm with Gemini about a cyber-themed RTS against an LLM opponent.
- With Claude Code: wrote the roadmap (phases, gates, decision framework), chose TypeScript + PixiJS over Unity because the code will be mostly agent-written and a text-only stack is easier for any agent to build and test.
- Decided to go open source (MIT), public after the first playable greybox.
- Scaffolded the repo: deterministic sim stub, headless runner (`npm run sim`), determinism tests, PixiJS window.
- Next: agree on the design pillars (Gate 0).
