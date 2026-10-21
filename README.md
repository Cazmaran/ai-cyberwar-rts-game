# AI Cyberwar RTS

An open-source real-time strategy game. Humans fight an AI faction for compute, bandwidth, and data inside a living network. The enemy is commanded by an LLM "General" that plans, adapts, bluffs, and taunts you.

**Status:** Phase 1 greybox: playable in the browser against a scripted AI, balance tuning in progress. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Design tenets

1. **AI integration by design:** humans and agents build it side by side, in any mix.
2. **One game, two kinds of players:** a human UI and an LLM control surface, with the same commands for both.
3. **Test-driven:** every change is a logical, tested unit.
4. **Balance is critical:** skill decides matches, not overpowered units.
5. **Many paths to victory:** strategies emerge, get countered, and become lore.

Details: [`docs/TENETS.md`](docs/TENETS.md).

## Built in the open, with any agent

This game is being built with AI coding agents, and the building is part of the fun. Use whatever agent you like (Claude Code, Codex, Cursor, Copilot, Aider) or none at all. Point it at [`AGENTS.md`](AGENTS.md) and pick an issue. Follow along in the [dev journal](docs/JOURNAL.md).

## Quick start

Requires Node.js 22.18 or newer.

```sh
npm install
npm run dev      # open the printed URL; add ?ai=rush|boom|turtle to pick the AI strategy
npm test
npm run sim      # run a match headless, no screen
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

Code: [MIT](LICENSE). Original art and audio will be CC-BY-4.0 when added.
