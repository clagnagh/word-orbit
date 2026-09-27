export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Phones get the system share sheet; everything else copies to the clipboard.
 * Must be called straight from a tap or click, because browsers only allow both then.
 */
export async function shareResult(text: string): Promise<ShareOutcome> {
  const phone = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (phone && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Share sheet unavailable here: fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return legacyCopy(text) ? 'copied' : 'failed';
  }
}

/** Older fallback for browsers or frames that block the clipboard API. */
function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
