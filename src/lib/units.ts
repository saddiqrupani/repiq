export const KG_PER_LB = 0.45359237;

export function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 100) / 100;
}

export function kgToLb(kg: number): number {
  return Math.round((kg / KG_PER_LB) * 10) / 10;
}

export function formatWeightLb(kg: number | null | undefined): string {
  if (kg == null) return 'BW';
  return `${kgToLb(kg)} lb`;
}
