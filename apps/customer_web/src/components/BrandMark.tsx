import { useState } from 'react';
import { useBranding } from '../lib/branding';

/** Restaurant logo; renders the name as a wordmark when there is no logo (or it fails to load). */
export function BrandMark({ className = '', wordmarkClassName = '' }: { className?: string; wordmarkClassName?: string }) {
  const { displayName, logoUrl } = useBranding();
  const [failedUrl, setFailedUrl] = useState('');

  if (logoUrl && failedUrl !== logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={displayName}
        className={`w-auto object-contain ${className}`}
        onError={() => setFailedUrl(logoUrl)}
      />
    );
  }
  return (
    <span
      className={`font-display font-bold leading-tight tracking-tight text-brand ${wordmarkClassName}`}
    >
      {displayName}
    </span>
  );
}
