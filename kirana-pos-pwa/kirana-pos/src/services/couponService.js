import { openDB } from "./db";
import { buildCustomerLoyaltyProfiles } from "./loyaltyEngine";

export async function createCoupon(coupon) {
  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("coupons", "readwrite");
    const store = tx.objectStore("coupons");

    store.put(coupon);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);

  });
}

export async function getAllCoupons() {
  const db = await openDB();

  return new Promise(resolve => {

    const tx = db.transaction("coupons", "readonly");
    const req = tx.objectStore("coupons").getAll();

    req.onsuccess = () => resolve(req.result || []);

  });
}

export async function toggleCoupon(id, active) {

  const db = await openDB();

  const tx = db.transaction("coupons", "readwrite");
  const store = tx.objectStore("coupons");

  const coupon = await store.get(id);

  coupon.active = active;

  await store.put(coupon);
}
export async function getEligibleCoupons(customerName) {

  const profiles = await buildCustomerLoyaltyProfiles();
  const coupons = await getAllCoupons();

  const profile = profiles[customerName.toLowerCase()];

  if (!profile) return [];

  return coupons.filter(coupon => {

    if (!coupon.active) return false;

    const required = coupon.loyaltyRequired;

    return loyaltyRank(profile.loyaltyLevel)
         >= loyaltyRank(required);
  });
}


function loyaltyRank(level) {

  const rank = {

    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4

  };

  return rank[level] || 0;
}