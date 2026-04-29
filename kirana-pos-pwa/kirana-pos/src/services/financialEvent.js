export function buildFinancialEvent({
  accountType,
  moneyDirection,
  stockEffect,
  customerName,
  amount
}) {
  let intent = "unknown";

  switch (accountType) {
    case "ITEM_SALE":
      intent = "sale";
      break;

    case "PAYMENT_IN":
      intent = "settlement";
      break;

    case "ADVANCE_DEPOSIT":
      intent = "advance";
      break;

    case "LOAN_GIVEN":
      intent = "loan";
      break;
  }

  return {
    version: 2, // important — new ledger format
    createdAt: Date.now(),
    actor: "shop",
    customer: customerName || null,

    // 🔴 CRITICAL — MONEY SOURCE OF TRUTH
    amount: Number(amount),

    intent,
    moneyFlow: moneyDirection,
    affectsStock: stockEffect === "OUT"
  };
}
