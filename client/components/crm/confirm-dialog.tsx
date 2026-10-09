import type { ReactElement, ReactNode } from 'react';
import { Button } from '../ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { useCrmText } from './api.js';

// The CRM's confirmation before a destructive action: a title naming the
// object, what it means, Cancel and a destructive confirm; it cannot be
// dismissed while the action runs.
export function ConfirmDialog({
  title,
  description,
  busy,
  confirmDisabled = false,
  confirmLabel,
  busyLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: ReactNode;
  busy: boolean;
  // The description explains why; the confirm button simply cannot proceed.
  confirmDisabled?: boolean;
  // The action the button takes ("Delete") and what it shows meanwhile;
  // "Confirm" and "Saving" when not given.
  confirmLabel?: string;
  busyLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' disabled={busy} onClick={onCancel}>
            {text('cancel')}
          </Button>
          <Button
            variant='destructive'
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {busy
              ? (busyLabel ?? text('saving'))
              : (confirmLabel ?? text('confirm'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
