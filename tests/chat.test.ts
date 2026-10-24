import { describe, expect, it } from 'vitest';
import { filterChat } from '../src/ai/llm/filter.ts';
import { MAX_TAUNT_LENGTH } from '../src/ai/llm/tools.ts';

// Phase 2 (M2.5): the General's messages are untrusted model output. Filter before showing them.
describe('chat output filter', () => {
  it('keeps ordinary trash talk', () => {
    expect(filterChat('Your substations are mine. Enjoy the dark.')).toBe('Your substations are mine. Enjoy the dark.');
  });

  it('masks blocked words, whole words only', () => {
    expect(filterChat('Shit, you are slow')).toBe('****, you are slow');
    expect(filterChat('Shitake mushrooms grow in the dark')).toBe('Shitake mushrooms grow in the dark');
  });

  it.each(['visit http://evil.example', 'join discord.gg', 'mail me at a@b.com', 'ask @admin', 'see www.thing'])(
    'drops messages with links or contact details: %s', (m) => { expect(filterChat(m)).toBeNull(); });

  it('strips control and invisible characters, collapses whitespace, and clips long text', () => {
    expect(filterChat('a\u0007b​‮c\n\n  d')).toBe('a b c d');
    expect(filterChat('   ')).toBeNull();
    const long = filterChat('x'.repeat(500))!;
    expect(long).toHaveLength(MAX_TAUNT_LENGTH);
    expect(long.endsWith('…')).toBe(true);
  });
});
