// Output filter for the General's chat (Phase 2, M2.5). Model text is untrusted: it is cleaned, shortened,
// and dropped if it carries links or contact details. A short blocklist masks slurs and the worst profanity
// so public builds stay civil; trash talk stays. Pure function, so it is easy to test and extend.
import { MAX_TAUNT_LENGTH } from './tools.ts';

/** Masked wherever they appear as a word (case-insensitive). Kept short and severe on purpose. */
const BLOCKED = ['fuck', 'fucking', 'shit', 'cunt', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'kike', 'spic', 'chink', 'tranny', 'whore', 'slut', 'rape', 'kys'];
const BLOCKED_RE = new RegExp(`\\b(${BLOCKED.join('|')})\\b`, 'gi');
/** Links, emails and handles could send players somewhere; the General has no reason to share any. */
const CONTACT_RE = /(https?:\/\/|www\.|\b[\w.-]+\.(com|net|org|io|gg|ru|cn|xyz)\b|[\w.+-]+@[\w-]+\.\w+|(^|\s)@\w+)/i;

/** The cleaned message, or null if it should not be shown at all. */
export function filterChat(raw: string): string | null {
  // Control characters and invisible format marks out; any whitespace run becomes one space.
  const text = raw.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length === 0 || CONTACT_RE.test(text)) return null;
  const clipped = text.length > MAX_TAUNT_LENGTH ? `${text.slice(0, MAX_TAUNT_LENGTH - 1)}…` : text;
  return clipped.replace(BLOCKED_RE, (w) => '*'.repeat(w.length));
}
