import { useEffect } from 'react';
import { FONT_PRESETS } from '../theme';

/** Loads the three Google Font pairs once so each sample is drawn in its own typeface. */
export function useBrandFonts() {
  useEffect(() => {
    for (const { href } of Object.values(FONT_PRESETS)) {
      if (document.head.querySelector(`link[href="${href}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);
}
