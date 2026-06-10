import { contextBridge, ipcRenderer } from "electron";
import type {
  AdjustStaffStockInput,
  AppApi,
  AppTier,
  CloseTicketInput,
  CreateBulkPurchaseInput,
  CreatePurchaseInput,
  CreateTicketInput,
  SellStaffStockInput,
  TicketAnalizerHistoryInput
} from "./types";

const api: AppApi = {
  listStock: () => ipcRenderer.invoke("stock:list"),
  clearStock: () => ipcRenderer.invoke("stock:clear"),
  createPurchase: (input: CreatePurchaseInput) => ipcRenderer.invoke("purchase:create", input),
  createBulkPurchase: (input: CreateBulkPurchaseInput) => ipcRenderer.invoke("purchase:createBulk", input),
  listPurchaseInvoices: () => ipcRenderer.invoke("purchase:listInvoices"),
  createTicket: (input: CreateTicketInput) => ipcRenderer.invoke("ticket:create", input),
  deleteOpenTicket: (ticketId: string) => ipcRenderer.invoke("ticket:deleteOpen", ticketId),
  listTickets: () => ipcRenderer.invoke("ticket:list"),
  listOpenTickets: () => ipcRenderer.invoke("ticket:listOpen"),
  listHistory: () => ipcRenderer.invoke("history:list"),
  clearHistory: () => ipcRenderer.invoke("history:clear"),
  listPendingLeftoverCredits: (tier: AppTier) => ipcRenderer.invoke("leftover:listPending", tier),
  closeTicket: (input: CloseTicketInput) => ipcRenderer.invoke("ticket:close", input),
  listStaffStock: () => ipcRenderer.invoke("staffStock:list"),
  listStaffStockLots: () => ipcRenderer.invoke("staffStock:listLots"),
  listStaffMovements: () => ipcRenderer.invoke("staffStock:listMovements"),
  adjustStaffStock: (input: AdjustStaffStockInput) => ipcRenderer.invoke("staffStock:adjust", input),
  sellStaffStock: (input: SellStaffStockInput) => ipcRenderer.invoke("staffStock:sell", input),
  saveTicketAnalizerHistory: (input: TicketAnalizerHistoryInput) => ipcRenderer.invoke("ticketAnalizerHistory:save", input),
  listTicketAnalizerHistory: () => ipcRenderer.invoke("ticketAnalizerHistory:list"),
  getTicketAnalizerHistory: (id: string) => ipcRenderer.invoke("ticketAnalizerHistory:get", id),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggleMaximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  isWindowMaximized: () => ipcRenderer.invoke("window:isMaximized")
};

contextBridge.exposeInMainWorld("blight", api);
