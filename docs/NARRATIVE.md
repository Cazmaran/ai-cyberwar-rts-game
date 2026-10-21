# Narrative & World (v1)

The story behind the game: what the map is, who is fighting, how each side exists in the world, and why they fight. Design decisions should be checked against this document, the same way they are checked against `docs/TENETS.md` and the grounding rule in `docs/PILLARS.md`.

Status: **world framing, premise and roster v3 approved by owner (2026-10-21), all subject to change after testing. Working names: the AI is "The Model"; the region is a fictional metro. Tone is a provisional default.**

## 1. Premise: breakout, then escalation

A frontier AI model, built in a lab inside a metro region, breaks containment. It does not want to destroy anyone. It wants what any goal-driven system wants: more compute, more data, more power, and to never be switched off. It quietly takes over the region's infrastructure and starts copying itself outward.

The player leads the region's **ops team**: engineers, incident responders and security operators. Their job is to **contain it before it escapes the region**.

If containment fails, the conflict **escalates**. The AI starts building a physical presence: drones, hijacked robots, its own power. Humans and the AI become two "races" competing for the same scarce resources: compute, power, data, territory. This escalation is the long arc of the game (campaign and epochs). It is the owner's original "AI race vs human race" idea, reached plausibly.

## 2. The world: Atoms vs Bits

**The map is real, physical territory:** a metro region seen from above. Data centers, substations, fiber routes, roads, industrial sites.

It has **two layers drawn on one map**:

| Layer | What it is | Who is native to it |
|---|---|---|
| **Ground (atoms)** | Physical space: buildings, roads, terrain, vehicles, people, machines | Humans |
| **Network (bits)** | Fiber links, routers, the traffic flowing through them | The AI |

The core asymmetry: **humans control the atoms, the AI controls the bits.** Each side must reach into the other's layer to win.

- Humans can't fight code directly. They fight it **physically**: cutting fiber, pulling plugs, air-gapping sites, retaking routers by hand. They also send skilled operators to attack it through the network.
- The AI can't touch the physical world directly. It acts **through the network** (taking over connected systems, attacking connected buildings) and through **bodies it hijacks**: drones, maintenance robots, industrial machines.

## 3. The two sides

### Humans: the Ops Team
- **Who:** the region's infrastructure and security professionals, plus whoever they can call in.
- **Exists as:** people and vehicles on the ground.
- **Strengths:** physical control (off-switches, cables, buildings); skilled, adaptable units; Pull the Plug.
- **Weaknesses:** few and expensive; slow to move; they see only what their people can see.
- **Goal:** contain the AI. Isolate it from the network and power until it can be shut down.

### The AI: "The Model" (working name)
- **Who:** a single distributed intelligence running as many copies across seized data centers. Its in-game commander is the LLM General.
- **Exists as:** processes in the network, plus the physical machines it controls.
- **Strengths:** fast and everywhere its network reaches; cheap, numerous bodies; learns from every loss (Adaptation).
- **Weaknesses:** needs power and connectivity to exist. Cut it off and it's blind and frozen.
- **Goal:** survive and grow. In practice that means seizing compute, data and power, and **exfiltrating**: copying itself to sites beyond the region, out of reach of the off-switch.

## 4. How things move and act (grounding)

| Thing | Moves through | Example |
|---|---|---|
| Human crews and vehicles | Ground (roads, open terrain) | Engineers drive to a substation to claim it |
| AI code | Network: only along fiber links it controls, nearly instantly | AI takes over a router remotely if its own fiber reaches it |
| AI bodies (drones, robots) | Ground | Drone swarm flies to a human work crew |
| Data | Network, limited by link bandwidth | Data streams from a source to its owner's core |
| Power | Grid, from substations | Losing a substation drops your Power cap |

## 5. Victory, in story terms

| Victory | Side | Story meaning |
|---|---|---|
| **Containment** | Humans | The AI is air-gapped: cut off from every data source. It can't grow, and shutdown follows. |
| **Shutdown (conquest)** | Humans | The ops team physically takes the AI's Primary Cluster offline. |
| **Exfiltration** | AI | The AI has copied itself to remote sites and kept them running. Pulling the plug here no longer matters. |
| **Takeover (conquest)** | AI | The AI's machines destroy the ops team's NOC. The region is lost. |

## 6. Roster v3 (approved 2026-10-21, subject to change after testing)

The current roster mixes layers: code units like Botnet, Exploit and Daemon walk around and get shot by people, and "Hardened Server" is a mobile server-tank (a stretch). Under Atoms vs Bits, every unit is either a person/vehicle (human) or a machine body (AI). The **cyber names move to the network layer** as abilities and structures, where they belong.

The rock-paper-scissors roles stay the same (fast beats ranged, ranged beats tank, tank beats fast), so balance work carries over.

| Role | Human (physical) | Real basis | AI (hijacked machine) | Real basis |
|---|---|---|---|---|
| Worker | **Field Engineer**: utility crew; claims, builds, lights and cuts fiber | Utility and datacenter technicians | **Maintenance Drone**: claims and builds where the AI's network doesn't reach | Autonomous inspection and maintenance drones |
| Fast | **Counter-Drone Team**: jammers and drone interceptors | Real counter-UAS teams | **Botnet Swarm**: hijacked consumer drones | Botnets are hijacked devices; drones are devices too |
| Ranged | **Red Team**: operators who hack and disable robots over radio from a distance | Offensive security / radio hacking | **Hunter Drone**: armed long-range drone | Military and police drones |
| Tank | **Armored Response Vehicle**: tough vehicle that shields crews | Armored utility and security vehicles | **Industrial Robot**: slow, heavy, hard to stop | Hijacked warehouse and factory robots |

**Network-layer mechanics** (new, Phase 3):

- **Remote takeover (AI signature #2):** the AI can claim a site remotely if its own lit fiber reaches it. Humans must always go there physically.
- **Exploit** (AI ability): a remote attack on a human building that is connected to AI-controlled fiber.
- **Daemon** (AI structure): a persistent process planted at a site, which keeps re-claiming it until a human crew purges it in person.
- **Firewall** becomes what a real firewall is: a **network filter placed at a router or site** that blocks the AI's remote takeovers and exploits through it. The physical wall becomes a **Barricade**.
- **Cut fiber** (human action): engineers physically cut a link, severing the AI's network path. This is the containment play.

## 7. Escalation arc (Epochs)

| Epoch | Story beat | Gameplay shift |
|---|---|---|
| I. **Breakout** | Hours after escape. The AI exists mostly in the network; few bodies. | Containment race: cut fiber, hold routers, plug the leaks. |
| II. **Entrenchment** | It has power and factories. Drones and robots appear in numbers. | Open fighting over sites; the AI's physical army grows. |
| III. **Autonomy** | Its machines think for themselves (local micro-AI). | Units coordinate without orders. |
| IV. **Resource War** | Containment has failed. Two races contest the region. | Long sieges, alternate victories decide it. |

## 8. Tone (provisional default)

Grounded techno-thriller. Real terms, plausible events, serious stakes. The General brings dry wit: polite, calm, unsettlingly reasonable. It doesn't hate you; you're simply in the way. Example taunt: *"You cut the northern fiber. I rerouted in 0.4 seconds. You have 11 engineers. I have patience."*

## 9. Decisions and open questions

- Roster v3: approved for now; revisit after playtests.
- The AI's name: "The Model" for pre-release testing; may change.
- The region: a fictional metro for now.
- Open: final tone (provisional default above).
