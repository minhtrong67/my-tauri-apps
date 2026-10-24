import { CalendarDays, Droplets, Leaf, Sun, Sunrise, Sunset, Umbrella, Wind, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useStore } from '../lib/store';
import { useT, wmoKey } from '../lib/i18n';
import { aqiInfo, clamp, deg, useFmt, windLabel } from '../lib/format';
import { useUI } from '../lib/ui';
import { Sheet } from './ui/Dialog';
import { WxIcon } from './WxIcon';
import { HourChart } from './Sections';

const Stat = ({ icon: I, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-1 rounded-2xl bg-sc p-3.5">
    <span className="flex items-center gap-1.5 text-xs text-on-surface-variant"><I size={15} />{label}</span>
    <b className="text-lg font-medium tabular-nums">{value}</b>
  </div>
);

/** Side sheet with the details of one forecast day. */
export function DaySheet() {
  const idx = useUI((s) => s.daySheet);
  const set = useUI((s) => s.set);
  const m = useStore((s) => s.model);
  const t = useT(), fmt = useFmt();
  const d = m && idx != null ? m.daily[idx] : null;
  const hours = m && d ? m.hourly.filter((h) => h.time.startsWith(d.date)) : [];
  return (
    <Sheet open={idx != null && !!d} onClose={() => set({ daySheet: null })} label={t('sheet.day')} icon={CalendarDays} title={d ? fmt.dayLong(d.date) : t('sheet.day')}>
      {m && d && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4 rounded-3xl bg-primary-container p-4 text-on-primary-container">
            <WxIcon code={d.code} isDay size={72} animated />
            <div>
              <div className="text-xl font-medium">{t(wmoKey(d.code))}</div>
              <div className="text-3xl font-light tabular-nums">{deg(d.max)} <span className="text-xl opacity-70">/ {deg(d.min)}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat icon={Umbrella} label={t('detail.rainChance')} value={`${Math.round(d.pop)}%`} />
            <Stat icon={Droplets} label={t('detail.precipSum')} value={`${d.precipSum.toFixed(1)} ${m.tempUnit === 'f' ? 'in' : 'mm'}`} />
            <Stat icon={Wind} label={t('detail.windMax')} value={`${Math.round(d.windMax)} ${windLabel(m.windUnit)}`} />
            <Stat icon={Sun} label={t('detail.uvMax')} value={d.uvMax.toFixed(1)} />
            <Stat icon={Sunrise} label={t('detail.sunrise')} value={fmt.clock(d.sunrise)} />
            <Stat icon={Sunset} label={t('detail.sunset')} value={fmt.clock(d.sunset)} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-primary">{t('sheet.hourly')}</h3>
            <div className="-mx-2 rounded-3xl bg-sc p-3"><HourChart hours={hours} metric="temp" /></div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/** Side sheet with the pollutants behind the air-quality index. */
export function AqiSheet() {
  const open = useUI((s) => s.aqiSheet);
  const set = useUI((s) => s.set);
  const aqi = useStore((s) => s.model?.aqi);
  const t = useT();
  const a = aqi?.us != null ? aqiInfo(aqi.us) : null;
  // [label key, value, unit, "high" reference used to scale the bar]
  const rows = aqi ? ([['aqi.pm25', aqi.pm25, 'µg/m³', 35], ['aqi.pm10', aqi.pm10, 'µg/m³', 150], ['aqi.o3', aqi.o3, 'µg/m³', 100], ['aqi.no2', aqi.no2, 'µg/m³', 100], ['aqi.so2', aqi.so2, 'µg/m³', 75], ['aqi.co', aqi.co, 'µg/m³', 10000]] as const) : [];
  return (
    <Sheet open={open} onClose={() => set({ aqiSheet: false })} label={t('detail.aqi')} icon={Leaf} title={t('detail.aqi')}>
      {aqi && a && (
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl p-5 text-white" style={{ background: a.color }}>
            <div className="text-5xl font-light tabular-nums">{Math.round(aqi.us!)} <small className="text-lg font-medium opacity-80">AQI</small></div>
            <div className="mt-1 text-lg font-semibold">{t(a.key)}</div>
            <p className="mt-2 text-sm opacity-95">{t(a.adv)}</p>
          </div>
          <div className="flex flex-col gap-3">
            {rows.map(([k, v, unit, ref]) => v != null && (
              <div key={k} className="rounded-2xl bg-sc p-3.5">
                <div className="flex items-baseline justify-between"><span className="text-sm">{t(k)}</span><b className="tabular-nums">{v.toFixed(v < 10 ? 1 : 0)} <small className="font-normal text-on-surface-variant">{unit}</small></b></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sc-highest"><i className="block h-full origin-left animate-[grow_0.8s_var(--ease-emphasized)_both] rounded-full" style={{ width: `${clamp((v / ref) * 100, 3, 100)}%`, background: v / ref > 1 ? '#e53935' : v / ref > 0.6 ? '#fb8c00' : '#43a047' }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
