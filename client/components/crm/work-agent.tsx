import { AgentAvatar } from '@nocobase/app-plugin-agents/client/chat';
import type { ReactElement } from 'react';
import { useCrmText } from './api.js';
import { useWorkAgentName, type Work } from './work-agent-name.js';

// A sentence naming the agent (`{{agent}}` in the text at `textKey`), its
// name set off from the words around it, led by its avatar as the Agents
// page draws it.
export function AgentSentence({
  textKey,
  name,
  nameClassName = 'font-medium text-foreground',
  avatar = true,
}: {
  textKey: string;
  name: string;
  // The name in bold black among the words, by default; in a button, a
  // chip or a tooltip, their own colour.
  nameClassName?: string;
  // Led by its avatar, by default; not beside the AI's sparkle on a chip.
  avatar?: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const [before = '', after = ''] = String(
    text(textKey, { agent: '\u0000' }),
  ).split('\u0000');
  // Without an avatar, plain words that wrap as a sentence does, their
  // spaces kept.
  if (!avatar)
    return (
      <span>
        {before}
        <span className={nameClassName}>{name}</span>
        {after}
      </span>
    );
  // With it, a centred row, so the avatar sits level with the words: the
  // spaces around the name (trimmed, as a flex row drops them) become its
  // gaps.
  return (
    <span className='inline-flex min-w-0 items-center gap-1'>
      {before.trim() ? <span>{before.trim()}</span> : null}
      <span
        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap ${nameClassName}`}
      >
        <AgentAvatar name={name} size='xs' />
        {name}
      </span>
      {after.trim() ? <span>{after.trim()}</span> : null}
    </span>
  );
}

// "By <agent> Agent" with what it does, beside a dialog's own AI action:
// the captures' heading and the merge proposal. Nothing without the agent.
export function WorkAgentLabel({
  work,
  does = 'organise',
  className = '',
}: {
  work: Work;
  // What it does in the dialog: organises, or proposes (the merge).
  does?: 'organise' | 'propose';
  className?: string;
}): ReactElement | null {
  const name = useWorkAgentName(work);
  if (!name) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}
    >
      <AgentSentence textKey={`agentWork.by.${does}`} name={name} />
    </span>
  );
}

// A record's AI words naming its work's agent (`agentWork.words.<wordKey>`)
// with its avatar: its buttons, chips, cards, progress and timeline lines.
// The AI's own words (`fallback`) while the work has no agent of its own.
// For an attribute or a pin's title, which take text alone, useAgentWords.
export function AgentWords({
  work,
  wordKey,
  fallback,
  inButton = false,
}: {
  work: Work;
  wordKey: string;
  fallback: string;
  // In a button, a chip or a tooltip: the name in their colour, without
  // its avatar, the AI's sparkle leading them.
  inButton?: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const name = useWorkAgentName(work);
  return name ? (
    <AgentSentence
      textKey={`agentWork.words.${wordKey}`}
      name={name}
      {...(inButton ? { nameClassName: 'font-medium', avatar: false } : {})}
    />
  ) : (
    <>{text(fallback)}</>
  );
}
