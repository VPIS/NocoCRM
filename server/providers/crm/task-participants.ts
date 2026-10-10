// Whether someone does a task: its owner or one of its participants, who
// alone read and ask for its AI preparation (task-preparation.ts). No
// imports, so the browser bundle takes it too.
export function doesTask(
  task: { ownerId?: unknown; internalParticipants?: unknown },
  userId: string,
): boolean {
  if (task.ownerId === userId) return true;
  const raw = task.internalParticipants;
  let list: unknown = raw;
  if (typeof raw === 'string')
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  return Array.isArray(list) && list.includes(userId);
}
