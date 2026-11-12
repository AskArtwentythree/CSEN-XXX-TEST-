export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** ⌘ on macOS, Ctrl elsewhere. */
export function isModKey(event: KeyboardEvent): boolean {
  return isMac ? event.metaKey : event.ctrlKey;
}

export function shortcutLabel(key: string, { shift = false } = {}): string {
  return isMac ? `${shift ? '⇧' : ''}⌘${key}` : `Ctrl+${shift ? 'Shift+' : ''}${key}`;
}

/** Text fields handle their own undo and typing, so global shortcuts skip them. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement &&
      !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(target.type))
  );
}
