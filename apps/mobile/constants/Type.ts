import { Platform } from 'react-native';

/**
 * Page titles use Playfair Display (loaded in app/_layout.tsx). Everything people read stays in the
 * system sans at large sizes. Gujarati, Hindi and Urdu titles fall back to the system font, which has
 * those scripts.
 */
export const DISPLAY = 'PlayfairDisplay_600SemiBold';
export const DISPLAY_BOLD = 'PlayfairDisplay_700Bold';

/** A very soft lift for white cards on the pale page. */
export const cardShadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(16,36,29,0.04), 0 6px 18px rgba(16,36,29,0.05)' } as object,
  default: { shadowColor: '#10241D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
});
