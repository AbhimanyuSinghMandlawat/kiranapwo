import { openDB, ADVANCE_STORE, PAYROLL_STORE, SALARY_HISTORY_STORE, STAFF_HISTORY_STORE } from "./core";

export async function addAdvance(advance) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(ADVANCE_STORE, "readwrite");
    tx.objectStore(ADVANCE_STORE).put(advance);
    tx.oncomplete = resolve;
  });
}

export async function getAdvancesByStaff(staffId) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(ADVANCE_STORE, "readonly");
    const req = tx.objectStore(ADVANCE_STORE).getAll();
    req.onsuccess = () => resolve(req.result.filter(a => a.staffId === staffId));
  });
}

export async function savePayrollRecord(record) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(PAYROLL_STORE, "readwrite");
    tx.objectStore(PAYROLL_STORE).put(record);
    tx.oncomplete = resolve;
  });
}

export async function getPayrollRecords() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(PAYROLL_STORE, "readonly");
    const req = tx.objectStore(PAYROLL_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

export async function addSalaryHistory(history) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SALARY_HISTORY_STORE, "readwrite");
    tx.objectStore(SALARY_HISTORY_STORE).put(history);
    tx.oncomplete = resolve;
  });
}

export async function getSalaryHistory(staffId) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(SALARY_HISTORY_STORE, "readonly");
    const req = tx.objectStore(SALARY_HISTORY_STORE).getAll();
    req.onsuccess = () => resolve(req.result.filter(h => h.staffId === staffId));
  });
}

export async function addStaffHistory(record) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STAFF_HISTORY_STORE, "readwrite");
    tx.objectStore(STAFF_HISTORY_STORE).put(record);
    tx.oncomplete = resolve;
  });
}

export async function getStaffHistory(staffId) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(STAFF_HISTORY_STORE, "readonly");
    const req = tx.objectStore(STAFF_HISTORY_STORE).getAll();
    req.onsuccess = () => {
      resolve(req.result.filter(r => r.staffId === staffId));
    };
  });
}
