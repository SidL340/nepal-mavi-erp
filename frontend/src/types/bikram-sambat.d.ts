declare module 'bikram-sambat' {
  export interface BikramDate {
    year: number;
    month: number;
    day: number;
  }
  export interface GregorianDate {
    year: number;
    month: number;
    day: number;
  }

  export function daysInMonth(year: number, month: number): number;
  export function toBik(greg: string | Date): BikramDate;
  export function toDev(year: number, month: number, day: number): { day: string; month: string; year: string };
  export function toBik_dev(greg: string | Date): string;
  export function toBik_euro(greg: string | Date): string;
  export function toBik_text(greg: string | Date): string;
  export function toGreg(year: number, month: number, day: number): GregorianDate;
  export function toGreg_text(year: number, month: number, day: number): string;

  const bs: {
    daysInMonth: typeof daysInMonth;
    toBik: typeof toBik;
    toDev: typeof toDev;
    toBik_dev: typeof toBik_dev;
    toBik_euro: typeof toBik_euro;
    toBik_text: typeof toBik_text;
    toGreg: typeof toGreg;
    toGreg_text: typeof toGreg_text;
  };
  export default bs;
}
