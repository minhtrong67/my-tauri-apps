import { memo } from 'react';
import { wxSvg } from '../lib/wxicons';

/** Weather illustration (generated, trusted markup). */
export const WxIcon = memo(function WxIcon({ code, isDay, size = 36, animated = false }: { code: number; isDay: boolean; size?: number; animated?: boolean }) {
  return <span className="inline-flex shrink-0" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: wxSvg(code, isDay, size, animated) }} />;
});
