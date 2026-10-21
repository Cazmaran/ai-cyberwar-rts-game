# Contributing

Welcome. You can contribute with any coding agent, or by hand, at any skill level.

## Getting started

1. Fork and clone the repo, then run `npm install`.
2. Read [`AGENTS.md`](AGENTS.md). Give it to your agent too.
3. Pick an issue. `good first issue` and `agent-friendly` issues are sized for one session and list the files involved and acceptance criteria.
4. Comment on the issue so others know you're on it.

## Making a change

- Keep PRs small and focused on one issue (soft limit ~400 changed lines, excluding data files and lockfiles). The maintainer reviews in limited time; small PRs get merged, huge ones wait.
- Sign off every commit (`git commit -s`). This is the [Developer Certificate of Origin](https://developercertificate.org/): you certify you have the right to submit the work, including code your agent wrote.
- Before opening a PR: `npm run typecheck` and `npm test` pass. For gameplay changes, also run `npm run sim`.
- Fill in the PR template. The "agent used / how it went" section is optional but encouraged.
- You are responsible for code your agent writes. Read and understand it before submitting.

## Design changes

Resources, units, factions, and win conditions are defined in [`docs/PILLARS.md`](docs/PILLARS.md). To propose a change, open an issue labeled `design` first. Accepted changes get an entry in [`docs/DECISIONS.md`](docs/DECISIONS.md). The project owner has final say on design pillars and licensing.

## Assets

Only add art or audio you created (licensed CC-BY-4.0 by contributing) or that is CC0 / MIT-compatible. State the source and license in the PR.

## Conduct

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
