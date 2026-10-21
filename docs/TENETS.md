# Design Tenets

The five commitments behind every decision in this project. Pillars (`docs/PILLARS.md`), roadmap, and code must serve these. Changing a tenet requires owner approval and a `docs/DECISIONS.md` entry.

## 1. AI integration by design

Humans and agents build this game side by side at every stage. Each contributor chooses how much their agent does: all of it, none of it, or anything in between.

**In practice**
- One tool-agnostic `AGENTS.md`; any agent or human can start from it.
- Same bar for every PR regardless of who or what wrote it: tests pass, one logical unit, matches the issue.
- Small PRs and a DCO sign-off on every commit. The contributor answers for what their agent wrote.
- Issues are sized and specified so a human or an agent can pick them up cold.
- The making-of is shared in `docs/JOURNAL.md`.

## 2. One game, two kinds of players: human UI and LLM control surface

The game is built for humans to play and for LLMs to play, in the same package. Neither is bolted on.

**In practice**
- Every action goes through one **layered command API**, open to every controller (human UI, scripted AI, LLM). No hidden powers for any.
  - *Unit orders:* `move`, `build`, `attack`, `ability`, …
  - *High-level orders:* `attack_sector`, `economy_focus`, `defend`, `expand`, … Humans can use them as squad automation; the LLM mostly uses these.
- Non-human controllers have an actions-per-minute cap and a reaction delay; LLM decisions apply a measured number of ticks after they are requested, never instantly.
- Every game state has a **text view**: a compact, named-sector summary an LLM can read and a human can inspect for debugging.
- The LLM control surface is documented and versioned like a public API.
- Fair-play rule: the LLM sees only what its faction could see (fog of war applies).
- Player chat with the General can never trigger commands, and the General's rules can't be overridden from chat.

## 3. Test-driven

Every change is a logical unit of work and is testable.

**In practice**
- The simulation is deterministic and headless, so any gameplay rule can be tested without a screen.
- New behavior arrives with a test. Bugs get a failing test first, then the fix.
- CI runs typecheck, tests, the determinism check, and a short sim batch on every push and PR. Red CI blocks merge.
- Matches replay exactly from seed + tick-stamped command log, so any bug or strategy can be reproduced. Sim math is integer/fixed-point so replays match on every machine.
- CI enforces a performance budget so the sim never quietly gets slower.

## 4. Balance is critical

As in Age of Empires / Rise of Rome, player skill should decide matches, not overpowered units.

**In practice**
- All unit and building numbers live in one data file, never hard-coded in logic.
- **Counter tests:** automated equal-cost fights between every unit pair; each counter must win within a target band, and no unit may beat everything.
- **Balance sims:** batch matches between strategy bots (rush, boom, turtle, containment, exfiltration); win rates must stay inside agreed bands at every gate.
- **Skill tests:** with identical builds, the better-microed side must win clearly. Skill, not unit choice, decides.
- Balance is tested on symmetric maps first, so map layout doesn't hide unit problems.
- Asymmetric factions are balanced by outcomes (win rates, cost-efficiency), not by mirroring stats.
- Any stat change PR includes before/after balance numbers.

## 5. Many paths to victory, and strategies that live on

There is more than one way to win. New strategies emerge, get tested by both sides, and become part of the game's memory and lore.

**In practice**
- Multiple win conditions, each grounded in the theme (see `docs/PILLARS.md`).
- Balance sims check that each victory path is viable, not just the dominant one.
- **Strategy memory:** the AI General keeps a playbook of what worked and failed against it across matches, and adapts. Its memory is readable, not hidden.
- **Lore codex:** notable strategies (by players or the AI) get named and recorded; replays can be shared so others can study and counter them.
- Replays, saves, strategy memory and lore entries carry game + data version stamps, so updates never silently break them.
