# Dev Journal

The story of building this game, newest first. Wins, failures, surprises, and what the agents did well or badly. Anyone can add an entry.

## 2026-10-21 — Five tenets and a hard look at the plan

- Owner set five tenets: AI-integrated development, human + LLM control in one package, test-driven, balance above all, many paths to victory.
- Reviewing every doc against them turned up real holes. The biggest: "same commands for humans and LLMs" didn't hold when the LLM gave strategic orders and humans clicked units. Fix: one layered command API that everyone can use.
- Also caught before writing game code: floats would break cross-machine replays, an LLM's thinking time would vanish in headless sims, and Adaptation could make the AI unbeatable. All now designed out.
- Added CI with a performance budget, CODEOWNERS, and DCO sign-off for agent-written code.

## 2026-10-21 — Gate 0: pillars locked

- New rule: every term must act like the real thing. That reshaped the draft: Bandwidth stopped being a currency and became link capacity, routers became passive junctions you capture, Firewall became a wall instead of a tank, and Crawler became the AI's worker.
- Hybrid economy: data streams home over links; workers build the network instead of hauling resources.
- Pull the Plug vs Adaptation approved as the heart of the game.
- Next: Phase 1, the playable greybox.

## 2026-10-21 — Day zero

- Started from a brainstorm with Gemini about a cyber-themed RTS against an LLM opponent.
- With Claude Code: wrote the roadmap (phases, gates, decision framework), chose TypeScript + PixiJS over Unity because the code will be mostly agent-written and a text-only stack is easier for any agent to build and test.
- Decided to go open source (MIT), public after the first playable greybox.
- Scaffolded the repo: deterministic sim stub, headless runner (`npm run sim`), determinism tests, PixiJS window.
- Next: agree on the design pillars (Gate 0).
