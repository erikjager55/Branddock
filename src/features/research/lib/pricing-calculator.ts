import { METHOD_PRICING } from "../constants/research-constants";

export function calculatePlanTotal(methods: { type: string; quantity: number }[]): number {
  return methods.reduce((total, m) => {
    const pricing = METHOD_PRICING[m.type];
    return total + (pricing ? pricing.price * m.quantity : 0);
  }, 0);
}

export function hasPaidMethods(methods: { type: string; quantity: number }[]): boolean {
  return methods.some((m) => {
    const pricing = METHOD_PRICING[m.type];
    return pricing && pricing.price > 0 && m.quantity > 0;
  });
}
