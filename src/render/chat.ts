// Chat panel (Phase 2, M2.5): the General's messages, newest last. Text only (textContent, never HTML),
// because the messages come from a model. Chat is talk: nothing here can issue a command.
export interface ChatPanel {
  push(tick: number, text: string): void;
}

const MAX_LINES = 6;

export function createChatPanel(root: HTMLElement, speaker: string, tickRate: number): ChatPanel {
  const panel = document.createElement('div');
  panel.id = 'hud-chat';
  panel.className = 'hud-panel';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  panel.setAttribute('aria-label', `Messages from ${speaker}`);
  root.appendChild(panel);
  return {
    push(tick, text) {
      const secs = Math.trunc(tick / tickRate);
      const line = document.createElement('div');
      const time = document.createElement('span');
      time.className = 'dim';
      time.textContent = `${Math.trunc(secs / 60)}:${String(secs % 60).padStart(2, '0')} `;
      const who = document.createElement('b');
      who.textContent = `${speaker}: `;
      line.append(time, who, document.createTextNode(text));
      panel.append(line);
      while (panel.childElementCount > MAX_LINES) panel.firstElementChild!.remove();
      panel.hidden = false;
    },
  };
}
