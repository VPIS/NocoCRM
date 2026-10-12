import { useCallback, useRef, type PointerEvent } from 'react';

// A board moved sideways by holding its empty space and dragging, as
// Trello's is: a press on the board, outside a card and outside anything
// that may be clicked or typed in, pans it until the button is let go.
// Cards keep their own drag (to another column), and a column's own
// scrolling, up and down, is untouched.
const SKIP =
  'a, button, input, textarea, select, label, [role="button"], [draggable="true"], [contenteditable="true"]';

export function useDragPan(): {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
} {
  const panRef = useRef<{ x: number; left: number } | null>(null);
  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    if ((event.target as Element).closest(SKIP)) return;
    const board = event.currentTarget;
    panRef.current = { x: event.clientX, left: board.scrollLeft };
    board.setPointerCapture(event.pointerId);
    board.dataset.panning = '';
    // No text is selected while the board moves.
    event.preventDefault();
  }, []);
  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!panRef.current) return;
    event.currentTarget.scrollLeft =
      panRef.current.left - (event.clientX - panRef.current.x);
  }, []);
  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!panRef.current) return;
    panRef.current = null;
    const board = event.currentTarget;
    if (board.hasPointerCapture(event.pointerId))
      board.releasePointerCapture(event.pointerId);
    delete board.dataset.panning;
  }, []);
  return { onPointerDown, onPointerMove, onPointerUp };
}
