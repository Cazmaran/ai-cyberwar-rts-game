# Dev Journal

The story of building this game, newest first. Wins, failures, surprises, and what the agents did well or badly. Anyone can add an entry.

## 2026-10-22 — Fourth playtest: first win, 23:56

- The owner beat the default AI in 23:56, a length that felt about right.
- What won it: defenses held, the right counters, and out-expanding the AI. Three different systems mattered, and two of them are new this session (defenses and expansions).
- "Play again?": maybe. Gate 1 needs a clear yes; finding out what's holding it back is next.
- What held it back: "I couldn't build any more armor or fast units, but I had plenty of Data." They had hit the Power cap, and nothing said so. Finished units waited silently and the Train buttons kept taking Data. Now the Power counter shows FULL, an alert fires, the Train buttons explain why they're disabled, and the text view marks `FULL` for LLMs.

## 2026-10-22 — The skill gate and the limits of scripted bots

- Bots attacked once their army reached N units. Human units cost about 1.6× more, so in boom matches the human army never reached the threshold and never attacked. The AI won by attrition. Bots now attack by army value in Data. Sloppy mirror matches went from 68/13/73% to 58/34/60% human wins.
- The skill test mixed in counter-building, which changes the build. Gate 1 says "better micro with identical builds", so the test now measures focus fire only. Counter-building turned out to hurt humans in boom anyway: Adaptation stacks resistance against whatever kills AI units, so massing one counter backfires. That is working as designed.
- Tried and dropped: split fire, fire distribution, kiting, regrouping, retreating wounded units, and denying the sloppy side Pull the Plug. None gave a consistent gain.
- The numbers are fragile. Raising rush's attack threshold from 250 to 300 Data dropped rush skill from 70% to 49%. With bots this crude, 40 seeds can't tell a 65% line from noise.

## 2026-10-22 — Third playtest: "botnets destroyed all my engineers"

- As soon as attacks started, Botnet Swarms flew straight to the human engineers. The owner asked whether botnets can travel off the network. They can, and that bends reality: hijacked drones need a control link.
- Prototyped a signal-range rule behind a flag (`docs/proposals/0001-signal-range.md`). It works as intended, but it crushes the AI's rush (2–16% overall). The next idea to try is mesh swarms: drones relay signal for each other.
- Three rounds later (hard leash, mesh swarms, soft autopilot), every version crushes the AI's attacks, because the AI always fights in the human base, out of its own signal. Lesson: a rule that limits where one side can fight is a rebalance of that side, not a tweak. Shelved behind its flag until Phase 3.

## 2026-10-22 — Defenses, expansions, and one number that mattered most

- Owner approved two design changes: static defenses (Security Post / Sentry Gun) and expansion sites. Rushing had no answer, and booming had no payoff.
- They flipped the meta more than once. Rush dominated, then boom did, then rush again. With 20 seeds, results swung ±20 points from small changes, so tuning now uses 40.
- The biggest lever was the AI worker's price. At 35 Data the AI out-expanded humans in every mirror match; at 50 humans did. 42 lands both sides close to even (mirror matches 53/53/59%).
- A trap: a mirror match one faction always wins makes the skill test read exactly 50%, whatever the skill. Faction parity has to come before skill tuning.
- Bot lesson: guarding the core was useless. Rushes kill workers out at the Data sources, so bots now put defenses next to their most exposed source.

## 2026-10-22 — Balance: the bots were fighting their own lag

- The AI side won most strategy matchups. Most of it turned out to be bot bugs, not unit stats:
  - At the APM cap a bot gets about one action per decision. A defending bot re-issued the same attack order every decision, so it never trained units or sent workers out while under attack.
  - A bot sees the world a reaction delay late, and that delay equals its decision interval. So it repeated every order once, wasting half its actions. In the opening it trained two workers instead of one. That left humans 30 Data short of their first production building, while the AI's cheaper drones left it room.
  - Fixes: bots remember orders and spending that aren't visible yet, give production priority over worker jobs, and stop growing the economy when a bigger enemy army is on their half.
- Tuning: starting Data 200 to 260, so both sides can afford a worker, a production building and a first unit. Adaptation 5% per death (cap 40%) to 3% (cap 25%): with the old values the AI won every long mirror match.
- Result: AI rush overall 90% to 73%; mirror matches now 40–50%. Skill test 25–55% to 58–70%.
- Still failing: rush beats boom every time, for both sides. Workers don't add income (Data comes from a fixed set of sources that 4 workers can claim), and nothing gives a defender a home advantage. Both are design questions for the owner.

## 2026-10-21 — Second playtest: more fun, still lost at 8:43

- Owner reached step 3 (economy + a SOC) but had almost no army when the first attack came, and couldn't read the fights.
- Added: alerts and map pings when AI forces are spotted on your half or near your buildings, and when a building takes damage; shot lines between fighting units; hit flashes; death markers; an intel panel listing visible enemy units with the counter to build; a shape legend.

## 2026-10-21 — First playtest: "I have no idea how to play"

- Owner's first session: 120 fps with 300 units (performance gate passed), but the game was unplayable for a newcomer. Everything lived behind hotkeys listed in a collapsed panel.
- Fixes: a clickable command card for the current selection (with costs, and tooltips explaining what each unit counters), a getting-started checklist that ticks itself off, hover tooltips for every map object, a "Connect fiber" button, a start screen with the goal, and a gentle `training` opponent (no attacks before minute 8) as the default.
- Lesson: an agent can verify rules with tests, but only a human can tell you the game is confusing. Playtest early.

## 2026-10-21 — Playable greybox

- The browser build works: `npm run dev`. Select, move, claim sites, light links, build, train, Pull the Plug, and fight a scripted AI.
- The UI has no special powers. Every click becomes a command from the same API the AI uses. Press `T` to see the text view an LLM General would read.
- `?stress=300` spawns 300 fighting units with an FPS counter for the Gate 1 performance check.

## 2026-10-21 — The balance harness finds bugs before balance

- Built `npm run balance`: equal-cost duel matrix, strategy tournament, skill test.
- Unit counters work (every counter wins 75–100% at equal cost).
- Matches were lopsided, and most of the cause was not unit stats. The harness exposed fairness bugs in the engine and bots:
  - Units acted in creation order. Humans spawn first, so human units always fired first, and AI units killed that tick never fired back. Now every unit alive at the start of a tick acts (simultaneous combat).
  - Units searched for targets on ticks staggered by unit id, so one side spotted the other first. Now everyone searches on the same ticks.
  - Two workers claiming the same site: whoever was processed first won. Now the site is contested and nobody progresses until one side leaves (or dies).
  - Both bots raced for the same equidistant site because of alphabetical tie-breaks. Now ties break by which side of the line between the bases a site lies on, so bots make mirror-image choices.
- Lesson: with a deterministic sim, "the human side wins 90%" is often an ordering bug, not a stats problem. Test fairness before tuning numbers.
- Gate status: counters pass; strategy and skill gates still fail (the AI side now wins most matchups). Tuning continues.

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
