import { openDB } from "./db";

export async function resolveCustomerIdentity({ name, phone }) {

  const db = await openDB();
  const tx = db.transaction("customers", "readwrite");
  const store = tx.objectStore("customers");

  if (phone) {
    const index = store.index("phone");
    const existing = await index.get(phone);

    if (existing && existing.id) {

      const cleanCustomer = {
        id: existing.id, // 🔥 MUST exist
        displayName: existing.displayName || name || "Unknown",
        phone: existing.phone || phone,
        aliases: Array.isArray(existing.aliases)
          ? [...existing.aliases]
          : [(existing.displayName || "").toLowerCase()].filter(Boolean),
        lifetimeSpend: existing.lifetimeSpend || 0,
        createdAt: existing.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      if (name && !cleanCustomer.aliases.includes(name.toLowerCase())) {
        cleanCustomer.aliases.push(name.toLowerCase());
      }

      await store.put(cleanCustomer);
      await tx.done;
      return cleanCustomer;
    }
  }

  // 🔥 CREATE NEW CUSTOMER (Always with id)
  const newCustomer = {
    id: crypto.randomUUID(), // 🔥 REQUIRED
    displayName: name || "Unknown",
    phone: phone || null,
    aliases: name ? [name.toLowerCase()] : [],
    lifetimeSpend: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await store.put(newCustomer);
  await tx.done;

  return newCustomer;
}