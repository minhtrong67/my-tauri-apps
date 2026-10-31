// Unit definitions: [id, factor-to-base, symbol, en, vi]. Temperature is handled separately.
const L = (rows) => rows.map(([id, f, sym, en, vi]) => ({ id, f, sym, en, vi }));

export const CATEGORIES = [
  { id: 'length', icon: 'straighten', base: 'm', units: L([
    ['nm', 1e-9, 'nm', 'Nanometers', 'Nanômét'], ['um', 1e-6, '\u00B5m', 'Micrometers', 'Micrômét'],
    ['mm', 1e-3, 'mm', 'Millimeters', 'Milimét'], ['cm', 1e-2, 'cm', 'Centimeters', 'Xentimét'],
    ['m', 1, 'm', 'Meters', 'Mét'], ['km', 1e3, 'km', 'Kilometers', 'Kilômét'],
    ['in', 0.0254, 'in', 'Inches', 'Inch'], ['ft', 0.3048, 'ft', 'Feet', 'Feet'],
    ['yd', 0.9144, 'yd', 'Yards', 'Yard'], ['mi', 1609.344, 'mi', 'Miles', 'Dặm'], ['nmi', 1852, 'nmi', 'Nautical miles', 'Hải lý']]) },
  { id: 'mass', base: 'kg', units: L([
    ['mg', 1e-6, 'mg', 'Milligrams', 'Miligam'], ['g', 1e-3, 'g', 'Grams', 'Gam'], ['kg', 1, 'kg', 'Kilograms', 'Kilôgam'],
    ['t', 1e3, 't', 'Metric tons', 'Tấn'], ['oz', 0.028349523125, 'oz', 'Ounces', 'Ounce'],
    ['lb', 0.45359237, 'lb', 'Pounds', 'Pound'], ['st', 6.35029318, 'st', 'Stones', 'Stone'], ['ct', 2e-4, 'ct', 'Carats', 'Carat']]) },
  { id: 'temperature', base: 'C', units: L([
    ['C', 1, '\u00B0C', 'Celsius', 'Độ C'], ['F', 1, '\u00B0F', 'Fahrenheit', 'Độ F'], ['K', 1, 'K', 'Kelvin', 'Kelvin']]) },
  { id: 'area', base: 'm\u00B2', units: L([
    ['mm2', 1e-6, 'mm\u00B2', 'Square millimeters', 'Milimét vuông'], ['cm2', 1e-4, 'cm\u00B2', 'Square centimeters', 'Xentimét vuông'],
    ['m2', 1, 'm\u00B2', 'Square meters', 'Mét vuông'], ['ha', 1e4, 'ha', 'Hectares', 'Héc-ta'],
    ['km2', 1e6, 'km\u00B2', 'Square kilometers', 'Kilômét vuông'], ['in2', 0.00064516, 'in\u00B2', 'Square inches', 'Inch vuông'],
    ['ft2', 0.09290304, 'ft\u00B2', 'Square feet', 'Feet vuông'], ['yd2', 0.83612736, 'yd\u00B2', 'Square yards', 'Yard vuông'],
    ['ac', 4046.8564224, 'ac', 'Acres', 'Mẫu Anh'], ['mi2', 2589988.110336, 'mi\u00B2', 'Square miles', 'Dặm vuông']]) },
  { id: 'volume', base: 'L', units: L([
    ['ml', 1e-3, 'mL', 'Milliliters', 'Mililít'], ['l', 1, 'L', 'Liters', 'Lít'], ['m3', 1e3, 'm\u00B3', 'Cubic meters', 'Mét khối'],
    ['tsp', 0.00492892159375, 'tsp', 'Teaspoons (US)', 'Muỗng cà phê (Mỹ)'], ['tbsp', 0.01478676478125, 'tbsp', 'Tablespoons (US)', 'Muỗng canh (Mỹ)'],
    ['floz', 0.0295735295625, 'fl oz', 'Fluid ounces (US)', 'Ounce chất lỏng (Mỹ)'], ['cup', 0.2365882365, 'cup', 'Cups (US)', 'Cốc (Mỹ)'],
    ['pt', 0.473176473, 'pt', 'Pints (US)', 'Panh (Mỹ)'], ['qt', 0.946352946, 'qt', 'Quarts (US)', 'Quart (Mỹ)'], ['gal', 3.785411784, 'gal', 'Gallons (US)', 'Gallon (Mỹ)']]) },
  { id: 'speed', base: 'm/s', units: L([
    ['ms', 1, 'm/s', 'Meters per second', 'Mét/giây'], ['kmh', 1 / 3.6, 'km/h', 'Kilometers per hour', 'Kilômét/giờ'],
    ['mph', 0.44704, 'mph', 'Miles per hour', 'Dặm/giờ'], ['kn', 1852 / 3600, 'kn', 'Knots', 'Hải lý/giờ'],
    ['fts', 0.3048, 'ft/s', 'Feet per second', 'Feet/giây'], ['mach', 340.29, 'Ma', 'Mach', 'Mach']]) },
  { id: 'time', base: 's', units: L([
    ['ms', 1e-3, 'ms', 'Milliseconds', 'Mili giây'], ['s', 1, 's', 'Seconds', 'Giây'], ['min', 60, 'min', 'Minutes', 'Phút'],
    ['h', 3600, 'h', 'Hours', 'Giờ'], ['d', 86400, 'd', 'Days', 'Ngày'], ['wk', 604800, 'wk', 'Weeks', 'Tuần'],
    ['mo', 2629746, 'mo', 'Months (avg.)', 'Tháng (TB)'], ['yr', 31556952, 'yr', 'Years (avg.)', 'Năm (TB)']]) },
  { id: 'data', base: 'bit', units: L([
    ['bit', 1, 'bit', 'Bits', 'Bit'], ['B', 8, 'B', 'Bytes', 'Byte'], ['KB', 8e3, 'KB', 'Kilobytes', 'Kilobyte'],
    ['MB', 8e6, 'MB', 'Megabytes', 'Megabyte'], ['GB', 8e9, 'GB', 'Gigabytes', 'Gigabyte'], ['TB', 8e12, 'TB', 'Terabytes', 'Terabyte'],
    ['PB', 8e15, 'PB', 'Petabytes', 'Petabyte'], ['KiB', 8192, 'KiB', 'Kibibytes', 'Kibibyte'], ['MiB', 8 * 2 ** 20, 'MiB', 'Mebibytes', 'Mebibyte'],
    ['GiB', 8 * 2 ** 30, 'GiB', 'Gibibytes', 'Gibibyte'], ['TiB', 8 * 2 ** 40, 'TiB', 'Tebibytes', 'Tebibyte']]) },
  { id: 'energy', base: 'J', units: L([
    ['J', 1, 'J', 'Joules', 'Jun'], ['kJ', 1e3, 'kJ', 'Kilojoules', 'Kilôjun'], ['cal', 4.184, 'cal', 'Calories', 'Calo'],
    ['kcal', 4184, 'kcal', 'Kilocalories', 'Kilôcalo'], ['Wh', 3600, 'Wh', 'Watt-hours', 'Oát-giờ'], ['kWh', 3.6e6, 'kWh', 'Kilowatt-hours', 'Kilôoát-giờ'],
    ['BTU', 1055.05585262, 'BTU', 'BTU', 'BTU'], ['eV', 1.602176634e-19, 'eV', 'Electronvolts', 'Electronvôn']]) },
  { id: 'power', base: 'W', units: L([
    ['W', 1, 'W', 'Watts', 'Oát'], ['kW', 1e3, 'kW', 'Kilowatts', 'Kilôoát'], ['MW', 1e6, 'MW', 'Megawatts', 'Mêgaoát'],
    ['hp', 745.69987158227, 'hp', 'Horsepower (mech.)', 'Mã lực (cơ học)'], ['ps', 735.49875, 'PS', 'Horsepower (metric)', 'Mã lực (hệ mét)'],
    ['btuh', 0.29307107, 'BTU/h', 'BTU per hour', 'BTU/giờ']]) },
  { id: 'pressure', base: 'Pa', units: L([
    ['Pa', 1, 'Pa', 'Pascals', 'Pascal'], ['kPa', 1e3, 'kPa', 'Kilopascals', 'Kilôpascal'], ['bar', 1e5, 'bar', 'Bar', 'Bar'],
    ['atm', 101325, 'atm', 'Atmospheres', 'Atmôtphe'], ['psi', 6894.757293168, 'psi', 'PSI', 'PSI'],
    ['mmHg', 133.322387415, 'mmHg', 'mmHg', 'mmHg'], ['torr', 101325 / 760, 'Torr', 'Torr', 'Torr']]) },
  { id: 'angle', base: '\u00B0', units: L([
    ['deg', 1, '\u00B0', 'Degrees', 'Độ'], ['rad', 180 / Math.PI, 'rad', 'Radians', 'Radian'], ['grad', 0.9, 'grad', 'Gradians', 'Grad'],
    ['turn', 360, 'turn', 'Turns', 'Vòng'], ['arcmin', 1 / 60, '\u2032', 'Arcminutes', 'Phút cung'], ['arcsec', 1 / 3600, '\u2033', 'Arcseconds', 'Giây cung']]) },
];

const toC = { C: (v) => v, F: (v) => ((v - 32) * 5) / 9, K: (v) => v - 273.15 };
const fromC = { C: (v) => v, F: (v) => (v * 9) / 5 + 32, K: (v) => v + 273.15 };

export function convert(cat, value, fromId, toId) {
  if (cat.id === 'temperature') return fromC[toId](toC[fromId](value));
  const a = cat.units.find((u) => u.id === fromId), b = cat.units.find((u) => u.id === toId);
  return (value * a.f) / b.f;
}
