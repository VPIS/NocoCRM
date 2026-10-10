import { Button } from '#components/ui/button';
import type { ChatContextItem } from '@nocobase/app-plugin-agents/client/chat';
import { Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';
import { useCrmText } from '../api.js';
import { useAgentReadiness, useDiscuss } from './ask.js';

// An AI card's Discuss: talking it over with Noco in a conversation of its
// own that changes nothing. The record and the card are pinned (the server
// resolves them for the agent, which reads the card from the record's
// history); nothing is sent, the question is the person's.
export function DiscussButton({
  pins,
}: {
  pins: readonly ChatContextItem[];
}): ReactElement | null {
  const { text } = useCrmText();
  const discuss = useDiscuss();
  const readiness = useAgentReadiness();
  // Only while Noco can answer.
  if (readiness.state !== 'ready') return null;
  return (
    <Button
      size='sm'
      variant='ghost'
      // Its icon in line with the card's text above: pulled out by its own
      // padding.
      className='-ml-2.5 text-ai hover:bg-ai/10 hover:text-ai'
      onClick={() => discuss(pins)}
    >
      <Sparkles />
      {text('evaluation.ask')}
    </Button>
  );
}
