// The words of the AI's state tag (ai-state-tag.tsx), by the work it does
// and where that stands.
export type AiWork = 'followUp' | 'review' | 'prep';

export const aiStateWords: Record<
  AiWork,
  Record<'running' | 'pending', string>
> = {
  followUp: {
    running: 'evaluation.onCard.running',
    pending: 'evaluation.onCard.pending',
  },
  review: {
    running: 'approvalReview.onRow.running',
    pending: 'approvalReview.onRow.pending',
  },
  // Waiting, every list says it alike: AI suggestion.
  prep: {
    running: 'taskPrep.onRow.running',
    pending: 'evaluation.onCard.pending',
  },
};
