/**
 * Database Module Facade
 * 
 * The 750+ line monolithic IndexedDB file has been refactored into modular domain stores.
 * This file serves as the main entry point to maintain backward compatibility
 * so that we do not have to update 46 imports across 26 different files.
 */

export * from "./stores/core";
export * from "./stores/saleStore";
export * from "./stores/stockStore";
export * from "./stores/userStore";
export * from "./stores/sessionStore";
export * from "./stores/payrollStore";
export * from "./stores/settingsStore";
export * from "./stores/supplierStore";
export * from "./stores/billRecordStore";
