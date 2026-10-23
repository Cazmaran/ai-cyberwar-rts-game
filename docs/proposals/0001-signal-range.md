# Proposal 0001: Signal range for AI machines

Status: **proposed, not approved; three rounds tested; recommendation: shelve until Phase 3.** Prototype in code behind `SIGNAL.enabled` (default `false`), so the live game is unchanged.

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

## Round 2: mesh swarms and partial leashes

Prototype knobs: `SIGNAL.mesh` (`'none'`, `'chain'`, `'swarm'`), `meshRange` (3 tiles), `swarmSize` (4), `roles`.

- **Chain mesh:** a machine relays signal for others within 3 tiles, if it is itself linked back to real signal.
- **Swarm mesh:** a machine with at least 3 others within 3 tiles coordinates locally, without the Model.

| Setting (range 8 unless noted) | Human overall rush/boom/turtle | AI overall rush/boom/turtle | Skill |
|---|---|---|---|
| Chain mesh | 78/72/55 | 7/61/27 | 53/81/69 |
| Chain mesh, mesh range 4 | 76/71/54 | 8/62/29 | 50/75/66 |
| Swarm mesh (4) | 76/64/48 | 9/63/40 | 55/73/71 |
| Swarm mesh (3) | 72/66/45 | 15/60/42 | 56/69/76 |
| Leash Botnet Swarms only | 79/62/46 | 6/64/43 | 50/71/69 |
| Leash Botnet Swarms only, swarm mesh | 75/64/45 | 12/63/41 | 54/71/71 |
| Leash Botnet Swarms only, range 10 | 76/71/50 | 11/57/35 | 50/68/65 |
| Bots start relays at half army | 82/98/95 | 5/15/6 | 51/55/54 |

**Reading:** no variant saves the AI's rush, and human rush then dominates (72–82% overall, gate max 65%).
- A rush works by arriving before the defender is ready. Any hard leash delays the first hit, because the army waits for a relay, and that is enough to lose.
- Mesh doesn't help because armies bunch together: the swarm can leave signal, but it isn't faster.
- Building relays earlier pulls workers off the economy and is far worse.

Skill improves in most variants. Boom and turtle skill reaches 70% or more, because fights happen on predictable ground.

## Round 3: soft leash (degraded autopilot)

Knobs: `SIGNAL.leash = 'soft'`, `autopilotSpeed`, `autopilotDamage` (percent of normal), `autopilotDeaf` (machines on autopilot ignore new orders). Out of signal, a machine keeps acting at reduced strength instead of stopping.

| Setting (range 8) | Human overall rush/boom/turtle | AI overall rush/boom/turtle | Skill |
|---|---|---|---|
| Soft 60% speed / 50% damage, ignores orders | 77/83/71 | 5/45/18 | 50/51/53 |
| Soft 80/75, ignores orders | 77/80/61 | 8/51/23 | 53/61/53 |
| Soft 80/75, takes orders | 76/72/52 | 11/56/33 | 50/66/57 |
| Soft 100/100 (no penalty), bots build relays | 66/55/45 | 23/66/45 | 73/62/70 |
| Soft 100/100, no relays (sanity: equals rule off) | 61/50/33 | 50/65/41 | 68/64/63 |
| Soft 80/60, takes orders, no relays | 77/78/62 | 5/54/25 | 54/65/53 |
| Soft 60/50, takes orders, no relays | 78/82/74 | 5/42/19 | 49/57/47 |

**Reading:** the soft leash fails for the same reason as the hard one.
- The AI wins by fighting in the human base, which is always out of its signal. So any penalty weakens exactly the attacks the AI depends on. Even 80% speed and 60% damage drops AI rush to 5%.
- Relay building costs the bot too: with no penalty at all, building relays alone drops AI rush from 50% to 23%.

**Conclusion after three rounds:** signal range is a large AI nerf in every form tested. It could only work as part of a wider rebalance that gives the AI something back. Examples: signal from human sites the AI captures, or cheaper and stronger machines inside its own network. That is a redesign of the AI's identity, not a tweak.

## Options to make it fair (need a decision)

1. **Mesh swarms:** tested in round 2; not enough on its own.
2. **Soft leash (degraded autopilot):** tested in round 3; the AI's attacks still collapse.
3. **Compensate with numbers:** wider range, cheaper relays, or cheaper AI units. Simple, but the tests above show range and price alone don't rescue rush.
4. **Leash only part of the roster:** for example, Hunter Drones (military drones with long-range links) are exempt.
5. **Don't adopt:** keep free movement and solve the playtest problem with UI and teaching (warnings, defenses near engineers).

Recommendation (after round 3): take option 5 for now. Keep the prototype behind its flag, and revisit signal range in Phase 3 together with fiber cutting and an AI rebalance.
