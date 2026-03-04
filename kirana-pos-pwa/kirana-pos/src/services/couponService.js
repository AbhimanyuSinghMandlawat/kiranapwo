import { openDB } from "./db";
import { getCustomerLoyalty } from "./loyaltyEngine";

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

  return new Promise((resolve, reject) => {

    const tx = db.transaction("coupons", "readwrite");
    const store = tx.objectStore("coupons");

    const req = store.get(id);

    req.onsuccess = () => {
      const coupon = req.result;
      if (!coupon) {
        resolve(false);
        return;
      }

      coupon.active = active;
      store.put(coupon);
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
export async function getEligibleCoupons(customerId, shopId) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("coupons", "readonly");
    const store = tx.objectStore("coupons");

    const request = store.getAll();

    request.onsuccess = async () => {

      const coupons = request.result || [];

      const loyalty = await getCustomerLoyalty(customerId);

      const filtered = coupons.filter(coupon => {

        if (!coupon.active)
          return false;

        if (coupon.shopId && coupon.shopId !== shopId)
          return false;

        if (new Date(coupon.expiryDate) < new Date())
          return false;

        if (
          loyaltyRank(loyalty) <
          loyaltyRank(coupon.loyaltyRequired)
        )
          return false;

        return true;
      });

      resolve(filtered);
    };

    request.onerror = () => reject(request.error);

  });
}

function loyaltyRank(level) {

  return {
    bronze: 1,
    silver: 2,
    gold: 3,
    platinum: 4
  }[level] || 1;

}