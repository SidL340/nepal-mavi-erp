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

// Auto-formats input as YYYY-MM-DD as user types numbers (e.g. 20800403 -> 2080-04-03)
export function formatDateInput(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// Get full month details including starting weekday (0=Sun, 6=Sat) and total days (29-32)
export function getBSMonthDetails(year: number, month: number) {
  const nepaliMonths = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
    'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत'
  ];
  const englishMonths = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
  ];

  let startDayOfWeek = 0;
  try {
    const adFirstDayStr = bs.toGreg_text(year, month, 1);
    if (adFirstDayStr) {
      const adDate = new Date(`${adFirstDayStr}T12:00:00Z`);
      startDayOfWeek = adDate.getUTCDay();
    }
  } catch (err) {
    console.error('Error getting startDayOfWeek:', err);
  }

  let totalDays = 30;
  for (let d = 29; d <= 32; d++) {
    try {
      const adStr = bs.toGreg_text(year, month, d);
      if (adStr) {
        const bsBack = bs.toBik_euro(adStr);
        const [by, bm, bd] = bsBack.split('-').map(Number);
        if (by === year && bm === month && bd === d) {
          totalDays = d;
        } else {
          break;
        }
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return {
    year,
    month,
    monthLabelNepali: nepaliMonths[month - 1] || String(month),
    monthLabelEnglish: englishMonths[month - 1] || String(month),
    startDayOfWeek,
    totalDays,
  };
}

