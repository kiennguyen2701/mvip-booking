export const CUSTOMER_DISCOUNT_RATE = 0.05;
export const PLATFORM_COMMISSION_RATE = 0.10;
export const AGENT_PAYOUT_RATE = 0.05;
export const PLATFORM_NET_RATE = 0.05;
export const TOTAL_SUPPLIER_ALLOCATION_RATE = 0.15;

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateBookingAllocation(totalBill: number) {
  const normalized = Number.isFinite(totalBill) ? totalBill : 0;

  const customerDiscountAmount = roundMoney(
    normalized * CUSTOMER_DISCOUNT_RATE,
  );
  const platformCommissionAmount = roundMoney(
    normalized * PLATFORM_COMMISSION_RATE,
  );
  const agentCommissionAmount = roundMoney(normalized * AGENT_PAYOUT_RATE);
  const platformNetAmount = roundMoney(normalized * PLATFORM_NET_RATE);

  return {
    totalBill: roundMoney(normalized),
    customerDiscountAmount,
    platformCommissionAmount,
    agentCommissionAmount,
    platformNetAmount,
    totalSupplierAllocationAmount: roundMoney(
      customerDiscountAmount + platformCommissionAmount,
    ),
  };
}