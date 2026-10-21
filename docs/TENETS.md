# Design Tenets

The five commitments behind every decision in this project. Pillars (`docs/PILLARS.md`), roadmap, and code must serve these. Changing a tenet requires owner approval and a `docs/DECISIONS.md` entry.

## 1. AI integration by design

Humans and agents build this game side by side at every stage. Each contributor chooses how much their agent does: all of it, none of it, or anything in between.

**In practice**
- One tool-agnostic `AGENTS.md`; any agent or human can start from it.
- Same bar for every PR regardless of who or what wrote it: tests pass, one logical unit, matches the issue.
- Issues are sized and specified so a human or an agent can pick them up cold.
- The making-of is shared in `docs/JOURNAL.md`.

## 2. One game, two kinds of players: human UI and LLM control surface

The game is built for humans to play and for LLMs to play, in the same package. Neither is bolted on.

**In practice**
- Every action goes through one **command API** (`move`, `build`, `attack`, `research`, …). The human UI issues commands; the LLM issues the same commands. No hidden powers for either.
- Every game state has a **text view**: a compact, named-sector summary an LLM can read and a human can inspect for debugging.
- The LLM control surface is documented and versioned like a public API.
- Fair-play rule: the LLM sees only what its faction could see (fog of war applies).

## 3. Test-driven

Every change is a logical unit of work and is testable.

**In practice**
- The simulation is deterministic and headless, so any gameplay rule can be tested without a screen.
- New behavior arrives with a test. Bugs get a failing test first, then the fix.
- CI runs typecheck, tests, the determinism check, and a short sim batch on every push and PR. Red CI blocks merge.
- Matches replay exactly from seed + command log, so any bug or strategy can be reproduced.

## 4. Balance is critical

As in Age of Empires / Rise of Rome, player skill should decide matches, not overpowered units.

**In practice**
- All unit and building numbers live in one data file, never hard-coded in logic.
- **Counter tests:** automated equal-cost fights between every unit pair; each counter must win within a target band, and no unit may beat everything.
- **Balance sims:** batch matches between scripted strategies; win rates must stay inside agreed bands at every gate.
- Asymmetric factions are balanced by outcomes (win rates, cost-efficiency), not by mirroring stats.
- Any stat change PR includes before/after balance numbers.

## 5. Many paths to victory, and strategies that live on

There is more than one way to win. New strategies emerge, get tested by both sides, and become part of the game's memory and lore.

**In practice**
- Multiple win conditions, each grounded in the theme (see `docs/PILLARS.md`).
- Balance sims check that each victory path is viable, not just the dominant one.
- **Strategy memory:** the AI General keeps a playbook of what worked and failed against it across matches, and adapts. Its memory is readable, not hidden.
- **Lore codex:** notable strategies (by players or the AI) get named and recorded; replays can be shared so others can study and counter them.
