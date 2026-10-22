# Proposal 0001: Signal range for AI machines

Status: **proposed, not approved.** Prototype in code behind `SIGNAL.enabled` (default `false`), so the live game is unchanged.

## Problem

In the owner's third playtest, Botnet Swarms flew straight to the human engineers and killed them as soon as attacks started. Nothing in the world limits where a hijacked machine can go. That bends reality: a hijacked consumer drone needs a control link, and its range is limited.

## Proposal

The Model controls its machines over a signal. **AI combat machines act only within signal range** of:

- an AI-owned site (core, router, Data source, substation),
- a built AI building, including a new **Signal Relay** (a hijacked cell tower or mesh repeater: cheap, fragile, needs power),
- AI-lit fiber.

Nothing inside a blackout gives signal.

| Situation | Behavior | Real-world basis |
|---|---|---|
| A move would leave signal | The machine stops at the edge | Operators keep drones inside link range |
| A machine loses signal (relay destroyed, site retaken, Pull the Plug) | It flies straight back toward the nearest signal, ignoring orders | Lost-link failsafe ("return to home") on real drones |
| Maintenance Drones | Not limited | Autonomous inspection routines (and the worker must be able to build relays) |

Gameplay this creates:

- **Safe ground for humans:** engineers away from the Model's network can only be hit after the AI extends its signal.
- **Relays become targets:** the AI must push its signal forward before attacking, and humans can snipe relays or Pull the Plug on them to strand an attack.
- **Containment gets teeth:** later, cutting fiber (Phase 3) also strands the units that depend on it.
- **Epoch III "Autonomy"** becomes a real upgrade: machines that no longer need the link.

## Prototype

- `src/sim/signal.ts`: coverage (built once per tick, integer math), `inSignal`, `nearestSignal`.
- `src/sim/units.ts`: edge stop and lost-link failsafe.
- `src/sim/data.ts`: `SIGNAL` (`enabled`, `range` 8 tiles); `signal_relay` (30 Data, 150 hp, power −1).
- AI bot: once its army is ready to attack, a worker builds relays along the line to the enemy core.
- Tests: `tests/signal.test.ts`.

## Balance results (40 seeds; human win %; "overall" averages each strategy's three matchups)

| Setting | Human overall rush/boom/turtle | AI overall rush/boom/turtle | Skill rush/boom/turtle |
|---|---|---|---|
| Off (current game) | 61/50/33 | 50/65/41 | 68/64/63 |
| On, range 6 | 82/47/39 | 2/73/57 | 58/74/86 |
| On, range 8 | 79/75/73 | 5/47/22 | 51/56/71 |
| On, range 10 | 76/73/58 | 11/55/27 | 50/74/78 |
| On, range 10, relay 15 Data / 50 work | 79/69/56 | 9/61/26 | 55/77/79 |
| On, range 12, relay 15 Data / 50 work | 69/66/52 | 16/67/31 | 56/69/72 |

Gate: no strategy above 65% overall; skill at least 70%.

**Reading:** as prototyped, the rule cripples the AI's rush (2–16% overall), and humans become too strong. Rushing is exactly what the rule is meant to slow, but it slows it too much: the army arrives, stops at the edge, and waits for a worker to walk a relay out. Skill improves for boom and turtle.

## Options to make it fair (need a decision)

1. **Mesh swarms:** AI combat machines also relay signal for each other over a short range (real drone swarms form mesh networks). A big group can push forward together; isolated raiders and stragglers get stranded. This is the most grounded fix and keeps the rule meaningful.
2. **Compensate with numbers:** wider range, cheaper relays, or cheaper AI units. Simple, but the tests above show range and price alone don't rescue rush.
3. **Leash only part of the roster:** for example, Hunter Drones (military drones with long-range links) are exempt.
4. **Don't adopt:** keep free movement and solve the playtest problem with UI and teaching (warnings, defenses near engineers).

Recommendation: try option 1 next, then re-run this table.
