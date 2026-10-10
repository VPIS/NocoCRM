// Where a suggestion stands, as a dot's colour: waiting amber, accepted
// green, failed red, anything else grey.
export function statusDot(status: string): string {
  return status === 'pending'
    ? 'bg-warning'
    : status === 'accepted'
      ? 'bg-success'
      : status === 'failed'
        ? 'bg-destructive'
        : 'bg-muted-foreground/40';
}
