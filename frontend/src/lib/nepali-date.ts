// Nepali date utilities using bikram-sambat package
import bs from 'bikram-sambat';

export function todayBS(): string {
  try {
    const today = new Date();
    const formatted = bs.toBik_euro(today.toISOString().slice(0, 10));
    return formatted; // e.g. "2081-05-15"
  } catch {
    return '2081-05-15';
  }
}

export function todayBSFormatted(): string {
  try {
    const today = new Date();
    return bs.toBik_euro(today.toISOString().slice(0, 10));
  } catch {
    return '2081-05-15';
  }
}

export function adToBS(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
    return bs.toBik_euro(d);
  } catch {
    return '';
  }
}

export function bsToLabel(bsStr: string): string {
  if (!bsStr) return '';
  const [y, m, d] = bsStr.split('-');
  const nepaliMonths = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
    'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
  ];
  const monthLabel = nepaliMonths[parseInt(m) - 1] || m;
  return `${d} ${monthLabel} ${y}`;
}

export function bsMonthLabel(monthNum: number): string {
  const months = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
  ];
  return months[monthNum - 1] || String(monthNum);
}

export function getCurrentBSMonth(): string {
  return todayBS().slice(0, 7); // YYYY-MM
}

export function getCurrentBSYear(): string {
  return todayBS().slice(0, 4);
}

// Convert BS date string (e.g. "2081-05-15") to AD Date string (e.g. "2024-08-31")
export function bsToAD(bsStr: string): string {
  try {
    const parts = bsStr.split('-').map(Number);
    return bs.toGreg_text(parts[0], parts[1], parts[2]);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
