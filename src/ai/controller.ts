import type { Command, FactionView } from '../sim/index.ts';

/**
 * Anything that plays a faction: scripted bot, LLM General, or (through the UI) a human.
 * Controllers see only their faction's view and act only through commands.
 */
export interface Controller {
  readonly name: string;
  /** Return commands in priority order; the harness may apply only the first few (APM cap). */
  decide(view: FactionView): Command[];
}
