# AI Cyberwar RTS

An open-source real-time strategy game. Humans fight an AI faction for compute, bandwidth, and data inside a living network. The enemy is commanded by an LLM "General" that plans, adapts, bluffs, and taunts you.

**Status:** Phase 0, early foundation. Nothing playable yet. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Built in the open, with any agent

This game is being built with AI coding agents, and the building is part of the fun. Use whatever agent you like (Claude Code, Codex, Cursor, Copilot, Aider) or none at all. Point it at [`AGENTS.md`](AGENTS.md) and pick an issue. Follow along in the [dev journal](docs/JOURNAL.md).

## Quick start

Requires Node.js 22.18 or newer.

```sh
npm install
npm run dev      # open the printed URL
npm test
npm run sim      # run a match headless, no screen
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

Code: [MIT](LICENSE). Original art and audio will be CC-BY-4.0 when added.
