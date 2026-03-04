import { openDB } from "./db";

export async function resolveCustomerIdentity({ name, phone }) {

  const db = await openDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("customers", "readwrite");
    const store = tx.objectStore("customers");

    if (phone) {
      const index = store.index("phone");
      const req = index.get(phone);

      req.onsuccess = () => {
        const existing = req.result;

        if (existing) {

          // 🔒 NEVER overwrite whole object
          if (name && !existing.displayName) {
            existing.displayName = name;
          }

          if (!existing.aliases) {
            existing.aliases = [];
          }

          if (name && !existing.aliases.includes(name.toLowerCase())) {
            existing.aliases.push(name.toLowerCase());
          }

          existing.updatedAt = Date.now();

          store.put(existing);

          tx.oncomplete = () => resolve(existing);
          return;
        }

        // CREATE NEW CUSTOMER
        const newCustomer = {
          id: crypto.randomUUID(),
          displayName: name || "Unknown",
          phone: phone,
          aliases: name ? [name.toLowerCase()] : [],
          lifetimeSpend: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        store.put(newCustomer);

        tx.oncomplete = () => resolve(newCustomer);
      };

      req.onerror = () => reject(new Error("Customer lookup failed"));
    } else {

      // No phone provided → always new record
      const newCustomer = {
        id: crypto.randomUUID(),
        displayName: name || "Unknown",
        phone: null,
        aliases: name ? [name.toLowerCase()] : [],
        lifetimeSpend: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.put(newCustomer);

      tx.oncomplete = () => resolve(newCustomer);
    }

  });
}