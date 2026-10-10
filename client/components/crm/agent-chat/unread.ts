import { useConversationList } from '@nocobase/app-plugin-agents/client/chat';

// How many of the person's open conversations have a reply they have not
// read (the plugin's `read`, false once the agent wrote after they last
// opened it), for the badge beside Conversations in the menu. It reads the
// list the panel and the page show (the same query, kept current by the
// plugin's realtime topic), counting the pages loaded: newest first, so a
// conversation just answered is always among them.
export function useUnreadConversations(): number {
  const list = useConversationList({});
  return (list.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((conversation) => !conversation.read).length;
}
