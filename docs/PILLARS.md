# Core Pillars (v2, approved at Gate 0 on 2026-10-21)

One page. Everything in Phase 1 is built from this. Changing it later needs a `docs/DECISIONS.md` entry.

## Fantasy

World and story: see `docs/NARRATIVE.md` (Atoms vs Bits). Where this file and the narrative disagree, the narrative's approved sections win and this file gets updated.


You are humanity's ops team holding critical infrastructure against an AI that learns from every fight. It talks to you. It lies to you. It gets better. You hold the one thing it can't learn its way around: the off-switch.

## Grounding rule

Every term must behave like its real-world counterpart. Where fun requires bending reality, note it in the glossary as a **stretch**, and the owner approves it.

## Match

- **Mode:** 1 human player vs 1 AI faction.
- **Length:** 15–25 minutes (long sieges come later).
- **Win (conquest, both sides):** take down the enemy's **core data center** (human HQ: **Network Operations Center**; AI HQ: **Primary Cluster**).
- **Alternate victories (approved 2026-10-21):**
  - **Humans: Containment.** Air-gap the AI: cut every link between its clusters and all Data Sources and hold that for N minutes. (Real: isolating a compromised system from the network.)
  - **AI: Exfiltration.** Copy its weights to N remote sites and keep them running for N minutes. Once it exists outside your reach, pulling the plug no longer works. (Real: model self-exfiltration, a recognized AI-safety risk.)
  - Each alternate victory is announced to the other side when it starts, so it can be countered, like the Wonder timer in Age of Empires.

## Economy (grounded)

Real infrastructure runs on electricity and computing capacity, and moves data over network links. The economy mirrors that:

| Resource | Real-world meaning | Game role |
|---|---|---|
| **Data** | Information collected from sources | Stockpiled currency. Produced at **Data Sources** (sensor arrays, archives, user populations) and streamed home automatically over network links. Workers claim sources and build/repair links; they never carry data. |
| **Compute** | Processing capacity of servers | Production speed. Each **Server Rack** you build adds capacity; building units, research and AI retraining all draw on it. Not stockpiled. |
| **Power** | Electricity | The cap. **Substations** on the map supply a fixed amount; every rack, building and unit draws some. Lose power and things shut down. |
| **Bandwidth** | Capacity of a network link | Not owned or spent. Each **Link** carries a limited amount of data per second. Your income is limited by the slowest link between a source and your core. |

## Map infrastructure

| Thing | Real-world meaning | Mechanic |
|---|---|---|
| **Link** (fiber line) | Physical cable carrying traffic | Connects sites; has a bandwidth limit; can be cut. |
| **Router** | Junction that forwards traffic, passive | Capturable junction. Whoever controls it decides whose traffic it forwards. It produces nothing itself. |
| **Substation** | Power distribution point | Capturable; supplies Power. |
| **Data Source** | Where data originates | Capturable; produces Data while connected to your network. |
| **Cooling** | Removes server heat | Server Racks run hot; without cooling, compute throttles. |
| **Router interception** | Whoever controls a router sees the traffic through it | Controlling a router lets you read (reveal) or drop the enemy's traffic passing through it. |
| **Grid instability** | Overloaded grids shed load with rolling blackouts | Anti-stalemate: after a set match time, rolling blackouts shrink the powered map. |

## Factions

**Humans ("Ops"):** few, expensive, skilled units; build and defend physical infrastructure.
Signature **Pull the Plug**: cut power to a zone. AI units and racks there shut down for a few seconds. (Real: physically killing power.)

**AI ("The Model"):** many cheap processes that copy themselves.
Signature **Adaptation**: data from units it loses is used to retrain. After a retraining delay that costs Compute, new units resist what killed the old ones. (Real: retraining on failure data.) The delay is the human's window.
Limits (so counters never stop mattering): resistance per damage type has a hard cap; it decays when that damage type stops appearing (real: a model drifts away from what it no longer sees); only the most recent deaths count.

**Fair play:** both factions act only through the same command API. Non-human controllers have an actions-per-minute cap and a reaction delay, and see only what their units can see.

## Units (worker + 3 combat per side, rock-paper-scissors)

| Role | Human | Real-world basis | AI | Real-world basis |
|---|---|---|---|---|
| Worker | **Field Engineer**: builds racks, links, repairs | Datacenter/network technicians | **Crawler**: claims and pulls data from sources | Web crawlers collect data |
| Fast / swarm-killer | **Incident Responder** | Security team that contains active intrusions | **Botnet**: cheap swarm | Many hijacked devices acting together |
| Ranged / siege | **Red Team** | Professional attackers who break systems | **Exploit**: hits structures hard | Code that abuses a vulnerability |
| Tank / holder | **Hardened Server** (slow, mobile bunker) — *stretch* | Locked-down, hard-to-breach machine | **Daemon**: persistent, hard to remove | Background process that keeps running |

Structures, not units: **Firewall** (filters traffic at a boundary, a wall/gate that blocks AI units and lets yours through), **Honeypot** (decoy that lures and traps AI units).

## Epochs (2 for now)

1. **Silicon & Script:** basic units, racks, links.
2. **Neural & Cloud:** upgrades; signature abilities at full strength.

## Decisions

0. **Alternate victories (Containment / Exfiltration) approved 2026-10-21.**
1. ~~Pull the Plug vs Adaptation~~ **Approved 2026-10-21.** Mirrors today's real debate about AI and society.
2. **Hybrid economy, approved 2026-10-21:** links carry data automatically; workers claim sources and build/repair links.
3. **Play as the AI faction: later, approved 2026-10-21.** Human-only through Gate 2; revisit in Phase 3+.
4. **Unit names approved as draft, 2026-10-21.** Refine at the Phase 4 art pass.
