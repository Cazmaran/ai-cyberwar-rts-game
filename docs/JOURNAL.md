# Dev Journal

The story of building this game, newest first. Wins, failures, surprises, and what the agents did well or badly. Anyone can add an entry.

## 2026-10-23 — Why rush keeps losing to boom

- Owner: "without at least some defensive play, I'm losing in rush v boom consistently." The bot data agreed: AI boom was the strongest strategy (65–69% overall).
- A deeper look (rush bot against AI boom, 20 seeds): the rush bot wins 14/20, because it takes the center Data sources first and out-earns boom by 2:00. AI boom builds a Sentry Gun at 0:12, and 50–80% of the rusher's losses happen near it. Pull the Plug silences it, but nothing tells the player.
- Tried and reverted: making boom build its turret at 2:30 instead. AI boom got stronger (73% overall; rush won 11/20), because the turret's 60 Data went into economy instead.
- Applied, with owner approval: Maintenance Drone cost 42 → 45 Data (work 1800). AI boom 69% → about 61%; human boom becomes viable. DATA_VERSION 11.

## 2026-10-23 — Twelfth playtest: closer, then one bad fight

- Lost to boom in 9:40, but with a clearly better economy and production than last time: Data earned 4,029 to 6,103 (1.5× behind, down from 2×), and 0:43 idle while units were affordable (down from 1:47).
- Armies were even (about 400 Data each) until a fight around 5:20 that the owner lost at about 435 against 550. The AI then camped the base and killed every new unit as it came out: 25 trained, 25 lost.
- A trend Gate 1 wants to see: each loss is closer, and the cause is clear and actionable.

## 2026-10-23 — Eleventh playtest: Center First is fragile

- Lost a rush against boom in 7:21. The AI earned 4,535 Data to the owner's 2,225. The owner's income ramped slowly: none until 1:00, one source until 2:30, about 10 Data/s only after 5:00. In the Center First win it was about 7 Data/s by 2:30. On top of that, 1:47 of idle production while units were affordable, and 13-for-13 unit trades that lost Data because human units cost more.
- The summary misled again: "Turning point: from 5:35 the AI out-earned you", when the AI had led almost the whole match apart from a brief dip. Turning points are now reported only for real comebacks; when one side led at least 80% of the time, the summary says so ("the AI out-earned you for 91% of the match").

## 2026-10-23 — Tenth playtest: center-first beats boom

- After three losses to `?ai=boom`, the owner won with their own plan: claim the two center Data sources first, then work back to connect everything. Data arrived later, but taking the center starved the AI's economy, and the rush held.
- That is the first strategy found by a player rather than suggested by the game or by us: a candidate for the lore system (Tenet 5). Name it "Center First".
- The summary told the wrong story for this win: both insight lines described the slow Center First opening, not the turnaround. Behind early, the owner out-earned the AI from about 3:00 to the end (6,992 Data to 3,880); the AI lost all 31 of its units. Added a "turning point" line (from when one side out-earned the other for good), and split idle production into "could afford a unit" (real slack) and "not enough Data" (starved).
- Gate 1 status: wins with two different approaches (defensive against turtle, Center First against boom), and every loss had a reason the owner could act on. That covers the D-015 skill and strategy criteria. Remaining: "do I want to play again?" and the 300-unit/60 fps check, which passed earlier.

## 2026-10-22 — Ninth playtest: the summary explains a loss

- Lost a rush against boom in 5:26 ("the AI is mass producing units at a rate I can't compete with"). The new summary said why. From about 1:15 the AI made 15 Data/s to the owner's 6: it held both center Data sources and its expansions, the owner only their home sources. It earned 3,838 Data to 1,619. The owner lost all 14 units while killing 4 of 38, and the SOC sat idle for 1:56.
- So it was economy, not unit spam. The game is behaving as designed; the lesson is to contest the center early and raid enemy workers.
- Summary fixes: "biggest gap" divided by a zero army ("1810.0×"). It now says "you had no army; the AI's was worth 1810 Data". A new economy line reports when the AI's income stayed 1.5× yours for a minute, and how many Data sources each side held.

## 2026-10-22 — Eighth playtest: a post-match summary

- Another rush loss against boom: "the AI had many more armor and ranged units than I did around 2:50." In bot matches, boom is normally behind a rush at 2:50 (45–195 Data of army against 160–260). So the likely causes were production gaps, plus AI units being cheaper (more bodies for the same Data). Neither of us could see which.
- Added a post-match summary: who won and when, the moment the AI's army was furthest ahead, totals (Data earned, combat units trained and lost, biggest army, time production sat idle), and army-value and income charts for both sides with hover readouts. Stats live in `src/harness/stats.ts` (no DOM), so headless runs and LLM benchmarks can use them later.
- Owner also asked for a counter on construction. The bar under unfinished buildings was showing their HP, not progress. It now shows real progress. The selection and intel panels say "Building: 45% · 8s (2 engineers)", or warn when no engineer is assigned, and the text view carries the same.

## 2026-10-22 — Seventh playtest: crushed rushing a boom

- Owner tried a rush against `?ai=boom` and lost badly. Their own diagnosis: "I should have been more aggressive with attacks. By the time I got moving, the AI had way more heavy units and I had no counter."
- A loss with a clear reason meets the Gate 1 "better play wins" criterion. The counter they were missing was the Red Team (double damage against tanks). Open question: did they see the counter hint in the intel panel?
- Also "data starved, even with 3 SOCs". Two hidden rules: training speed comes from one shared Compute pool, so extra SOCs add nothing (only Server Racks do); and the two home sources give only 4.8 Data/s. Owner chose to keep the pool and explain it. The SOC and Server Rack tips, and the Compute tooltip, now say so; the SOC button warns when you already have one; and hovering a Data source shows its rate.

## 2026-10-22 — Sixth playtest: first win against a strategy AI

- Owner beat `?ai=turtle`, the first win against a full-strength strategy bot.
- Asked for a countdown to the next unit. Production buildings now show a training bar on the map. The selection panel and intel panel say "Training Red Team: 6s (+2 queued)", or "waiting for Power". The text view carries the same, so LLMs get it too.

## 2026-10-22 — Fifth playtest: faster win, ready for the real AI

- Owner won again against the training AI in 16:07, down from 23:56, playing conservatively and managing Power and units better. Getting faster once a rule makes sense is what Gate 1 means by "better play wins".
- Unit spacing, the strength readout and fog shading all helped. The Power cap never came up.
- "Play again?": ready to face the strategy AIs (rush, boom, turtle). Those matches decide the rest of Gate 1.

## 2026-10-22 — Fourth playtest: first win, 23:56

- The owner beat the AI in 23:56, a length that felt about right. Correction: with no `?ai=` in the URL the game uses the gentle training opponent, so this was a win against training, not the full-strength bots.
- What won it: defenses held, the right counters, and out-expanding the AI. Three different systems mattered, and two of them are new this session (defenses and expansions).
- "Play again?": maybe. Gate 1 needs a clear yes; finding out what's holding it back is next.
- What held it back: "I couldn't build any more armor or fast units, but I had plenty of Data." They had hit the Power cap, and nothing said so. Finished units waited silently and the Train buttons kept taking Data. Now the Power counter shows FULL, an alert fires, the Train buttons explain why they're disabled, and the text view marks `FULL` for LLMs.
- Owner kept the Power cap ("I just didn't understand it as a game rule"). Also hard to read: overlapping units, the enemy's strength, and what was fogged. Fixes: units spread apart; the intel panel shows an army strength for each side (Data value scaled by health) with a verdict; fogged ground is shaded.

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
