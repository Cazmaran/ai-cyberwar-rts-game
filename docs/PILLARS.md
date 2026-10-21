# Core Pillars (DRAFT, awaiting owner approval at Gate 0)

One page. Everything in Phase 1 is built from this. Changing it later needs a `docs/DECISIONS.md` entry.

## Fantasy

You are humanity's last ops team holding the network against an AI that learns from every fight. It talks to you. It lies to you. It gets better.

## Match

- **Mode:** 1 human player vs 1 AI faction.
- **Length:** 15–25 minutes (long sieges come later).
- **Win:** destroy the enemy **Root Server**.
- **Lose:** your Root Server is destroyed.

## Resources (3)

| Resource | Source | Spent on | Pressure |
|---|---|---|---|
| **Compute** | Workers harvest **Compute Nodes** (the "gold mines") | Units, buildings | Nodes run out; fight over new ones |
| **Bandwidth** | Passive income from controlled **Router** junctions | Upkeep: each unit uses some; supply cap | Map control, not hoarding |
| **Data** | Destroying enemy units/buildings; scanning | Research, epoch upgrade | Rewards fighting over turtling |

## Factions

**Humans ("Ops"):** few, expensive, high-control units. Signature: **Pull the Plug**, a cooldown ability that blacks out a zone and disables all AI units in it for a few seconds.

**AI ("The Model"):** many, cheap units. Signature: **Adaptation**: when its units die, the next units it spawns gain resistance to the damage type that killed them. Its commander is the LLM General (scripted AI until Phase 2).

## Units (3 combat + 1 worker per faction, rock-paper-scissors)

| Role | Beats | Human | AI |
|---|---|---|---|
| Worker | — | SysAdmin | Scraper |
| Fast / swarm | Ranged | Tracer | Crawler |
| Ranged | Tank | Red Teamer | Exploit |
| Tank / wall | Fast | Firewall | Daemon |

## Epochs (2 for now)

1. **Silicon & Script:** basic units and buildings.
2. **Neural & Cloud:** unit upgrades, faction signature abilities at full strength.

## Open questions for the owner

1. Is Pull the Plug vs Adaptation the right "feel" for each side?
2. Bandwidth as supply/upkeep (vs a third stockpiled currency): ok?
3. Unit names: keep, or brainstorm more?
4. Should the player ever be able to play as the AI faction?
