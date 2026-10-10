import { crmNoticeRenderer } from './inbox-notices.js';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  infoCategory,
  type InboxRegistry,
} from '../../extensions/nocobase-inbox/registry.js';
import type {
  InboxCollectionCategory,
  InboxCollectionInput,
  InboxCollectionState,
} from '../../extensions/nocobase-inbox/model.js';
import { useCrmText, useMetadata } from './api.js';
import {
  DECISIONS_CATEGORY,
  DECISION_PARAM,
  isDecided,
  useDecisions,
} from './inbox-decisions-data.js';
import { DecisionDetail, DecisionList } from './inbox-decisions-view.js';
import { PlanDetail, PlanList } from './inbox-plans.js';
import { useInboxPlans } from './plans.js';

// The AI's suggestions as a category of the inbox (inbox-decisions-data.ts
// says what they are).

// The inbox's registry: the AI's suggestions, for whoever may see them (the
// assistant on and the page grant crm-decisions, which the permission sets
// still give), the plans agents proposed to the reader, for whoever has any
// (inbox-plans.tsx), then the in-app notifications. The template's own decision
// category is left out: nothing in the CRM sends a notice of kind decision.
export function useCrmInboxRegistry(): {
  registry: InboxRegistry;
  key: string;
} {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const { can } = useCan({
    resource: { type: 'page', id: 'crm-decisions' },
    action: 'access',
  });
  const shown = meta?.assistant === true && can;
  const label = text('inbox.suggestions');
  // Plans only for a reader with some to show, so that To do is not offered
  // to everyone else for nothing.
  const plans = useInboxPlans().plans.length > 0;
  const plansLabel = text('plans.category');
  const registry = useMemo<InboxRegistry>(
    () => ({
      // The CRM's notifications drawn with who, when and their record.
      renderers: [crmNoticeRenderer],
      feeds: [],
      categories: [
        ...(shown ? [decisionsCategory(label)] : []),
        ...(plans ? [plansCategory(plansLabel, shown)] : []),
        infoCategory,
      ],
    }),
    [shown, plans, label, plansLabel],
  );
  // The categories are fixed for a mounted inbox, whose collections are
  // hooks: a change remounts it.
  return {
    registry,
    key: `${shown ? 'suggestions' : 'notifications'}${plans ? '-plans' : ''}`,
  };
}

function decisionsCategory(label: string): InboxCollectionCategory {
  return {
    type: 'collection',
    id: DECISIONS_CATEGORY,
    label: () => label,
    param: DECISION_PARAM,
    params: [],
    // Only To do: in All the group would follow every notification loaded.
    views: ['todo'],
    useCollection: useDecisionsCollection,
    Detail: DecisionDetail,
  };
}

function useDecisionsCollection({
  filter,
  selectedId,
  onSelect,
  params,
}: InboxCollectionInput): InboxCollectionState {
  const query = useDecisions();
  const items = useMemo(() => query.data?.data ?? [], [query.data]);
  // The changes suggested in conversations are drawn in this group, between
  // the suggestions waiting and the handled ones, since the inbox places a
  // collection's group only after another's whole group; their own group is
  // left empty (usePlansCollection). Picking one selects it as the plans'
  // collection would: its parameter, every other selection dropped.
  const plans = useInboxPlans();
  const [searchParams, setSearchParams] = useSearchParams();
  const pickPlan = (id: string): void =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete(DECISION_PARAM);
      next.delete('item');
      next.set(PLAN_PARAM, id);
      return next;
    });
  const waiting = items.filter((entry) => !isDecided(entry));
  const chosen = filter.kind === DECISIONS_CATEGORY;
  // Beside the list on a wide screen, the first suggestion stands open
  // before any pick, as the inbox's first item does; narrow, the list and
  // the entry take turns, so nothing opens by itself.
  const first = (chosen ? items : waiting)[0]?.id;
  const nothingOpen =
    filter.view === 'todo' &&
    !selectedId &&
    !params.get('item') &&
    !params.get(PLAN_PARAM);
  // onSelect is a new function on every render of the inbox.
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  });
  useEffect(() => {
    if (!nothingOpen || !first) return;
    if (!window.matchMedia?.('(min-width: 64rem)').matches) return;
    selectRef.current(first);
  }, [nothingOpen, first]);
  const list = (
    <DecisionList
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
      error={query.error}
      loading={query.isLoading}
    />
  );
  const group = (
    <DecisionList
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
      error={query.error}
      loading={query.isLoading}
      between={
        plans.plans.length ? (
          <PlanList
            plans={plans.plans}
            selectedId={searchParams.get(PLAN_PARAM)}
            onSelect={pickPlan}
            loading={plans.query.isLoading}
            error={plans.query.error}
            onRetry={() => void plans.query.refetch()}
          />
        ) : null
      }
    />
  );
  return {
    // Shown while there is any, handled or not, so that the way to the
    // handled ones stays in reach when nothing waits; and while a plan is
    // listed in it.
    count: items.length + plans.plans.length,
    loaded: !query.isLoading,
    waiting: query.data?.meta.pending ?? 0,
    group,
    list,
  };
}

// The plans agents proposed to the reader (inbox-plans.tsx), after the AI's
// suggestions: a group only while the reader has any.
const PLANS_CATEGORY = 'crm-plans';
const PLAN_PARAM = 'plan';
function plansCategory(
  label: string,
  inSuggestions: boolean,
): InboxCollectionCategory {
  return {
    type: 'collection',
    id: PLANS_CATEGORY,
    label: () => label,
    param: PLAN_PARAM,
    views: ['todo'],
    after: DECISIONS_CATEGORY,
    useCollection: inSuggestions ? usePlansInSuggestions : usePlansCollection,
    Detail: PlanDetail,
  };
}

function usePlansCollection({
  selectedId,
  onSelect,
}: InboxCollectionInput): InboxCollectionState {
  const { query, plans } = useInboxPlans();
  const list = (
    <PlanList
      plans={plans}
      selectedId={selectedId}
      onSelect={onSelect}
      loading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
    />
  );
  return {
    count: plans.length,
    loaded: !query.isLoading,
    waiting: plans.filter((plan) => plan.status === 'pending').length,
    group: list,
    list,
  };
}

// Beside the AI's suggestions, its group is drawn inside theirs
// (useDecisionsCollection); listed alone through the kind filter, it is its
// own list.
function usePlansInSuggestions(
  input: InboxCollectionInput,
): InboxCollectionState {
  return { ...usePlansCollection(input), count: 0, group: null };
}
