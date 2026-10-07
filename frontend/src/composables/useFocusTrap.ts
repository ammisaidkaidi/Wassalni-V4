import { watch, type Ref } from 'vue';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Task 15.3 — accessibility: focus trapping for modal dialogs.
 *
 * While `active` is true, moves keyboard focus into the dialog, keeps
 * Tab/Shift+Tab cycling within it (so keyboard users can never tab "behind"
 * the modal into the rest of the page), and restores focus to whatever had
 * it before the modal opened once it closes. Escape-to-close is left to the
 * caller (most modals already have their own close/cancel semantics tied to
 * Escape).
 *
 * Direct port of the original React `useFocusTrap` hook, adapted to a Vue
 * `watch()` on the `active` ref instead of a `useEffect` dependency array.
 */
export function useFocusTrap(elRef: Ref<HTMLElement | null>, active: Ref<boolean> | boolean): void {
  let cleanup: (() => void) | null = null;

  function activate(): void {
    const container = elRef.value;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const first = focusables()[0];
    (first ?? container).focus();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    cleanup = () => {
      container.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }

  function deactivate(): void {
    cleanup?.();
    cleanup = null;
  }

  const isActive = (): boolean => (typeof active === 'boolean' ? active : active.value);

  watch(
    [elRef, () => isActive()],
    ([, isActiveNow], [, wasActive]) => {
      if (isActiveNow && !wasActive) activate();
      else if (!isActiveNow && wasActive) deactivate();
    },
    { immediate: true },
  );
}
