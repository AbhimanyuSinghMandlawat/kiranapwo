import {
  getAllUsers,
  addAdvance,
  getAdvancesByStaff,
  savePayrollRecord,
  getPayrollRecords,
  addSalaryHistory,
  saveUser
} from "./db";

import { logStaffAction } from "./staffHistory";

// Helper to get current month-year key
function getCurrentMonthYear() {
  const d = new Date();
  return `${d.getMonth() + 1}-${d.getFullYear()}`;
}

// ===== ADVANCE MANAGEMENT =====

export async function createAdvance(staffId, amount, note = "", currentUser) {
  const advanceRecord = {
    advanceId: crypto.randomUUID(),
    staffId,
    amount: Number(amount),
    remainingAmount: Number(amount),
    date: new Date().toISOString(),
    note
  };

  await addAdvance(advanceRecord);

  // LOG ACTION
  await logStaffAction(
    staffId,
    "advance_added",
    null,
    advanceRecord,
    currentUser?.username || "system"
  );
}

// Get total pending advance for staff
export async function getPendingAdvanceAmount(staffId) {
  const advances = await getAdvancesByStaff(staffId);

  return advances.reduce((sum, a) => sum + (a.remainingAmount || 0), 0);
}

// ===== SALARY CALCULATION =====

export async function calculateSalaryForStaff(staff, deductionAmount = 0, bonus = 0) {

  const pendingAdvance = await getPendingAdvanceAmount(staff.id);

  const validDeduction = Math.min(deductionAmount, pendingAdvance);

  const finalPayable =
    Number(staff.baseSalary || 0) +
    Number(bonus || 0) -
    Number(validDeduction || 0);

  return {
    baseSalary: Number(staff.baseSalary || 0),
    pendingAdvance,
    appliedDeduction: validDeduction,
    bonus: Number(bonus || 0),
    finalPayable: finalPayable < 0 ? 0 : finalPayable
  };
}

// ===== PAYROLL PROCESSING =====

export async function markSalaryPaid(staff, deduction, bonus, currentUser) {
  const monthYear = getCurrentMonthYear();

  const calculation = await calculateSalaryForStaff(
    staff,
    deduction,
    bonus
  );

  const payrollRecord = {
    recordId: crypto.randomUUID(),
    staffId: staff.id,
    monthYear,
    baseSalary: calculation.baseSalary,
    bonusTotal: calculation.bonus,
    deductionTotal: calculation.appliedDeduction,
    finalPayable: calculation.finalPayable,
    isPaid: true,
    paidDate: new Date().toISOString()
  };

  await savePayrollRecord(payrollRecord);

  // LOG SALARY PAYMENT
  await logStaffAction(
    staff.id,
    "salary_paid",
    null,
    payrollRecord,
    currentUser?.username || "system"
  );

  // Update advances – reduce remaining amounts
  let remainingToDeduct = calculation.appliedDeduction;

  const advances = await getAdvancesByStaff(staff.id);

  for (let adv of advances) {
    if (remainingToDeduct <= 0) break;

    const deduct = Math.min(adv.remainingAmount, remainingToDeduct);

    adv.remainingAmount -= deduct;
    remainingToDeduct -= deduct;

    await addAdvance(adv);
  }
}

// ===== PENDING PAYMENTS =====

export async function getPendingSalaries() {
  const users = await getAllUsers();
  const records = await getPayrollRecords();

  const monthYear = getCurrentMonthYear();

  const activeStaff = users.filter(
    u => u.role !== "owner" && u.isActive !== false && !u.isDeleted
  );

  const pending = [];

  for (let staff of activeStaff) {
    const paid = records.find(
      r => r.staffId === staff.id && r.monthYear === monthYear
    );

    if (!paid) {
      pending.push(staff);
    }
  }

  return pending;
}

// ===== SALARY CHANGE LOG =====

export async function changeStaffSalary(staff, newSalary, reason = "", currentUser) {

  const oldSalary = staff.baseSalary || 0;

  staff.baseSalary = Number(newSalary);

  await addSalaryHistory({
    historyId: crypto.randomUUID(),
    staffId: staff.id,
    oldSalary,
    newSalary: Number(newSalary),
    changedOn: new Date().toISOString(),
    reason
  });

  // LOG SALARY CHANGE
  await logStaffAction(
    staff.id,
    "salary_change",
    { salary: oldSalary },
    { salary: Number(newSalary), reason },
    currentUser?.username || "system"
  );

  return staff;
}

// ===== SOFT DELETE STAFF =====

export async function softDeleteStaff(staff, currentUser) {

  const oldData = { ...staff };

  staff.isDeleted = true;
  staff.isActive = false;

  await saveUser(staff);

  // LOG SOFT DELETE
  await logStaffAction(
    staff.id,
    "soft_delete",
    oldData,
    { isDeleted: true },
    currentUser?.username || "system"
  );

  return staff;
}
