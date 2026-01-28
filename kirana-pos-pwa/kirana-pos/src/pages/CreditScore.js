// src/services/creditScore.js
import { getCustomerProfiles } from "./customerProfile";

export async function getCreditTrustScores() {
  const profiles = await getCustomerProfiles();

  return profiles.map(profile => {
    let score = 50;

    if (profile.creditSalesCount > 0) {
      score += profile.settlementCount * 10;

      const pending = profile.creditTaken - profile.creditSettled;
      if (pending > 0) {
        score -= 20;
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      customerName: profile.customerName,
      creditScore: score
    };
  });
}