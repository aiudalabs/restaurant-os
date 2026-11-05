import { useMemo } from 'react';
import QRCode from 'qrcode';

/** Member QR drawn as SVG rects (no HTML injection); `value` is the member id. */
export function MemberQr({ value, size, label }: { value: string; size: number; label: string }) {
  const cells = useMemo(() => {
    if (!value) return null;
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    return { n: qr.modules.size, data: qr.modules.data as unknown as ArrayLike<number> };
  }, [value]);

  if (!cells) return <div style={{ width: size, height: size }} />;
  const rects: string[] = [];
  for (let y = 0; y < cells.n; y++) {
    for (let x = 0; x < cells.n; x++) {
      if (cells.data[y * cells.n + x]) rects.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${cells.n} ${cells.n}`} width={size} height={size} shapeRendering="crispEdges" fill="#141414">
      <path d={rects.join('')} />
    </svg>
  );
}
