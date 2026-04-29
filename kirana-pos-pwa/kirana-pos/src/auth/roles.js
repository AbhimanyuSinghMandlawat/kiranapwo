export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  CASHIER: "cashier",
  CUSTOMER: "customer"
};

export const PERMISSIONS = {
  CAN_ADD_SALE: "CAN_ADD_SALE",
  CAN_VIEW_REPORTS: "CAN_VIEW_REPORTS",
  CAN_EDIT_STOCK: "CAN_EDIT_STOCK",
  CAN_MANAGE_USERS: "CAN_MANAGE_USERS"
};

export const ROLE_PERMISSIONS = {
  owner: [
    PERMISSIONS.CAN_ADD_SALE,
    PERMISSIONS.CAN_VIEW_REPORTS,
    PERMISSIONS.CAN_EDIT_STOCK,
    PERMISSIONS.CAN_MANAGE_USERS
  ],

  manager: [
    PERMISSIONS.CAN_ADD_SALE,
    PERMISSIONS.CAN_VIEW_REPORTS,
    PERMISSIONS.CAN_EDIT_STOCK
  ],

  cashier: [
    PERMISSIONS.CAN_ADD_SALE
  ],

  customer: []
};

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission);
}
