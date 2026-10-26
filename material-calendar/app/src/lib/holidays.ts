import { addDays } from './core';
import { lunar } from './lunar';

type N = [string, string];
const SOLAR: Record<string, N> = {
  '1/1': ['New Year’s Day', 'Tết Dương lịch'], '14/2': ['Valentine’s Day', 'Valentine'], '8/3': ['Int’l Women’s Day', 'Quốc tế Phụ nữ'], '30/4': ['Reunification Day', 'Giải phóng miền Nam'],
  '1/5': ['Labour Day', 'Quốc tế Lao động'], '1/6': ['Children’s Day', 'Quốc tế Thiếu nhi'], '2/9': ['National Day', 'Quốc khánh'], '20/10': ['Vietnamese Women’s Day', 'Phụ nữ Việt Nam'],
  '20/11': ['Teachers’ Day', 'Nhà giáo Việt Nam'], '24/12': ['Christmas Eve', 'Đêm Giáng sinh'], '25/12': ['Christmas', 'Giáng sinh'],
};
const LUNAR: Record<string, N> = {
  '1/1': ['Lunar New Year (Tết)', 'Tết Nguyên Đán'], '2/1': ['Tết, day 2', 'Mùng 2 Tết'], '3/1': ['Tết, day 3', 'Mùng 3 Tết'], '15/1': ['Lantern Festival', 'Rằm tháng Giêng'], '3/3': ['Cold Food Festival', 'Tết Hàn Thực'],
  '10/3': ['Hùng Kings’ Day', 'Giỗ Tổ Hùng Vương'], '15/4': ['Vesak', 'Phật Đản'], '5/5': ['Mid-year Festival', 'Tết Đoan Ngọ'], '15/7': ['Vu Lan', 'Vu Lan'], '15/8': ['Mid-Autumn Festival', 'Tết Trung Thu'],
  '23/12': ['Kitchen Gods’ Day', 'Ông Táo chầu trời'],
};
export function holiday(d: Date): N | null {
  const s = SOLAR[`${d.getDate()}/${d.getMonth() + 1}`];
  if (s) return s;
  const l = lunar(d);
  if (!l.leap && LUNAR[`${l.d}/${l.m}`]) return LUNAR[`${l.d}/${l.m}`];
  const n = lunar(addDays(d, 1));
  return n.d === 1 && n.m === 1 && l.m === 12 ? ['Lunar New Year’s Eve', 'Giao thừa'] : null;
}
