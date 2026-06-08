// Global single-instance tooltip host. Both the hover ("stored") card and the
// selection card render through here, so showing one always displaces the
// other — there is never more than one tooltip on the page at a time.
//
// Positioning is anchor-driven: the card is pinned below a live anchor rect and
// re-pinned on scroll/resize ("follow"), so it tracks the queried word instead
// of freezing at the coordinates captured when it first opened.
import { createRoot, type Root } from 'react-dom/client';
import HoverTooltip from '@/src/components/transline/HoverTooltip';

const HOST_ID = 'meow-tooltip-host';
const TOOLTIP_WIDTH = 340;
const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 14;

/** Returns the current viewport rect of the anchor, or null if it is gone. */
export type AnchorRect = () => DOMRect | null;

export interface ShowTooltipOptions {
  word: string;
  mode: 'stored' | 'selection';
  anchorRect: AnchorRect;
  /** Re-pin below the anchor on scroll/resize. Otherwise scrolling dismisses. */
  follow?: boolean;
  /** Dismiss on outside mousedown / Escape (selection card behaviour). */
  dismissOnOutside?: boolean;
  /** Called when the manager tears this tooltip down, so the owner can reset. */
  onDismiss?: () => void;
  onHostPointerEnter?: () => void;
  onHostPointerLeave?: () => void;
}

interface ActiveTooltip {
  token: number;
  anchorRect: AnchorRect;
  follow: boolean;
  dismissOnOutside: boolean;
  onDismiss?: () => void;
}

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let active: ActiveTooltip | null = null;
let docHandlersBound = false;
let pointerEnterCb: (() => void) | null = null;
let pointerLeaveCb: (() => void) | null = null;
let tokenSeq = 0;

function clampLeft(centerX: number): number {
  const minLeft = VIEWPORT_MARGIN;
  const maxLeft = Math.max(
    VIEWPORT_MARGIN,
    window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
  );
  return Math.min(
    Math.max(centerX - TOOLTIP_WIDTH / 2, minLeft),
    maxLeft,
  );
}

function reposition(): void {
  if (!host || !active) return;
  const rect = active.anchorRect();
  if (!rect) return;
  host.style.left = `${clampLeft(rect.left + rect.width / 2)}px`;
  host.style.top = `${Math.min(
    rect.bottom + ANCHOR_GAP,
    window.innerHeight - VIEWPORT_MARGIN,
  )}px`;
}

function onScroll(): void {
  if (!active) return;
  if (active.follow) reposition();
  else dismissTooltip(active.token);
}

function onResize(): void {
  if (active?.follow) reposition();
}

function onPointerDown(event: MouseEvent): void {
  if (!active?.dismissOnOutside) return;
  const target = event.target;
  if (host && target instanceof Node && host.contains(target)) {
    return;
  }
  dismissTooltip(active.token);
}

function onKeyDown(event: KeyboardEvent): void {
  if (active?.dismissOnOutside && event.key === 'Escape') {
    dismissTooltip(active.token);
  }
}

function bindDocHandlers(): void {
  if (docHandlersBound) return;
  docHandlersBound = true;
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize, true);
  document.addEventListener('mousedown', onPointerDown, true);
  window.addEventListener('keydown', onKeyDown, true);
}

function unbindDocHandlers(): void {
  if (!docHandlersBound) return;
  docHandlersBound = false;
  window.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', onResize, true);
  document.removeEventListener('mousedown', onPointerDown, true);
  window.removeEventListener('keydown', onKeyDown, true);
}

function ensureHost(): void {
  if (host) return;
  host = document.createElement('div');
  host.id = HOST_ID;
  // Skip marker only; HoverTooltip's own root owns the tooltip-root marker so
  // the attribute is never nested/duplicated.
  host.dataset.meowIgnore = 'true';
  host.style.position = 'fixed';
  host.style.width = `${TOOLTIP_WIDTH}px`;
  host.style.zIndex = '2147483647';
  host.style.top = '-9999px';
  document.body.appendChild(host);
  root = createRoot(host);
}

function detachPointerCbs(): void {
  if (host && pointerEnterCb) {
    host.removeEventListener('mouseenter', pointerEnterCb);
  }
  if (host && pointerLeaveCb) {
    host.removeEventListener('mouseleave', pointerLeaveCb);
  }
  pointerEnterCb = null;
  pointerLeaveCb = null;
}

/** Show a tooltip, displacing any current one. Returns its dismissal token. */
export function showTooltip(opts: ShowTooltipOptions): number {
  ensureHost();

  // Displace the current tooltip and let its owner reset before we take over.
  const displaced = active?.onDismiss;
  active = null;
  detachPointerCbs();
  displaced?.();

  const token = ++tokenSeq;
  active = {
    token,
    anchorRect: opts.anchorRect,
    follow: opts.follow ?? false,
    dismissOnOutside: opts.dismissOnOutside ?? false,
    onDismiss: opts.onDismiss,
  };

  if (opts.onHostPointerEnter) {
    pointerEnterCb = opts.onHostPointerEnter;
    host?.addEventListener('mouseenter', pointerEnterCb);
  }
  if (opts.onHostPointerLeave) {
    pointerLeaveCb = opts.onHostPointerLeave;
    host?.addEventListener('mouseleave', pointerLeaveCb);
  }

  bindDocHandlers();
  reposition();
  root?.render(
    <HoverTooltip
      word={opts.word}
      mode={opts.mode}
      onClose={() => dismissTooltip(token)}
    />,
  );
  return token;
}

/**
 * Tear down the active tooltip. A stale token (the tooltip was already replaced)
 * is ignored, so late owner cleanups can safely call this.
 */
export function dismissTooltip(token?: number): void {
  if (token !== undefined && token !== active?.token) return;
  const owner = active?.onDismiss;
  active = null;
  detachPointerCbs();
  unbindDocHandlers();
  root?.render(null);
  owner?.();
}
