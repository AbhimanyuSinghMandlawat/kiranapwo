// src/services/creditAdvisor.js

import { computeCustomerAccounts } from "./accountingEngine";
import { buildCustomerProfiles } from "./customerProfile";
import { t } from "../i18n/i18n";


/*
  CREDIT ADVISOR
  Decides whether shopkeeper SHOULD give credit
  (Never blocks — only advises)
*/

export async function evaluateCreditDecision(customerName, newAmount) {

  if (!customerName || !newAmount || newAmount <= 0) {
    return null;
  }

  const name = customerName.toLowerCase();

  const accounts = await computeCustomerAccounts();
  const profiles = await buildCustomerProfiles();

  const acc = accounts[name] || {
    goodsDue: 0,
    advance: 0,
    loan: 0
  };

  const profile = profiles[name];

  // If no history → neutral behaviour
  const safeLimit =
    profile?.decision?.maxAllowedCredit ?? 500;

  const currentOutstanding = acc.goodsDue + acc.loan;
  const afterTransaction = currentOutstanding + newAmount;

  /* ===============================
     DECISION ENGINE
  =============================== */

  let level = "allow";
  let message = "Safe to give credit";

  // Crossing recommended limit
  if (safeLimit === 0) {
    level = "danger";
    message = "Blocked customer — avoid credit";
  }else {
    const ratio = afterTransaction / safeLimit;
    if (ratio <= 1) {
      level = "allow";
      message = t("creditAdvisor.allow");
    }

    else if (ratio <= 1.4) {
        level = "warn";
        message = t("creditAdvisor.warn");
    }
    
    else if (ratio <= 2) {
        level = "danger";
        message = t("creditAdvisor.danger");
    }
    else {
        level = "danger";
        message = t("creditAdvisor.excessivePending");
    }

  }

  // Very risky
  if (afterTransaction > safeLimit * 2 || safeLimit === 0) {
    level = "danger";
    message = t("creditAdvisor.highRisk");
  }

  /* ===============================
     FRIENDLY EXTRA CONTEXT
  =============================== */

  let behaviourNote = "";

  if (profile) {
    const { loyalty, paymentHabit } = profile.behaviour;

    if (paymentHabit === "fast")
      behaviourNote = t("creditAdvisor.fast");

    else if (paymentHabit === "normal")
      behaviourNote = t("creditAdvisor.normal");

    else if (paymentHabit === "slow")
      behaviourNote = t("creditAdvisor.slow");

    else if (paymentHabit === "never")
      behaviourNote = t("creditAdvisor.never");

    if (loyalty === "regular")
      behaviourNote += " • " + t("creditAdvisor.regular");
  }

  return {
    level,
    message,
    behaviourNote,
    currentOutstanding,
    afterTransaction,
    safeLimit
  };
}
