export const toCurrencyCents = (amount: number) => Math.round((amount || 0) * 100);

export const DEBT_SETTLEMENT_MARKER = 'BORC-MAHSUP';

export const isDebtSettlementDescription = (description = '') =>
  description.toLocaleUpperCase('tr-TR').includes(DEBT_SETTLEMENT_MARKER);

export const getFullCreditOffset = (debt: number, credit: number, duesAmount = 0) => {
  const debtCents = Math.max(0, toCurrencyCents(debt));
  const creditCents = Math.max(0, toCurrencyCents(credit));
  const duesCents = Math.max(0, toCurrencyCents(duesAmount));

  if (debtCents <= 0 || creditCents <= 0) return 0;

  const usableCreditCents = duesCents > 0
    ? Math.floor(creditCents / duesCents) * duesCents
    : creditCents;

  return Math.min(debtCents, usableCreditCents) / 100;
};

export const getNetDebtAfterFullCredit = (debt: number, credit: number, duesAmount = 0) =>
  Math.max(0, debt - getFullCreditOffset(debt, credit, duesAmount));

export const getRemainingCreditAfterFullDebt = (debt: number, credit: number, duesAmount = 0) =>
  Math.max(0, credit - getFullCreditOffset(debt, credit, duesAmount));
