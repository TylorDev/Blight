import { app, BrowserWindow, ipcMain } from "electron";
import Module from "node:module";
import { join } from "node:path";
import type {
  AdjustStaffStockInput,
  AppTier,
  CloseTicketInput,
  CreateBulkPurchaseInput,
  CreatePurchaseInput,
  CreateTicketInput,
  SellStaffStockInput,
  TicketAnalizerHistoryInput
} from "./types";

type ResolveFilename = (
  request: string,
  parent: NodeJS.Module | undefined,
  isMain: boolean,
  options?: unknown
) => string;
type ResolvableModule = typeof Module & {
  _resolveFilename: ResolveFilename;
};

const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const appIconPath = join(__dirname, "../../src/Resources/BlightAppIcon.png");
const startupLogsEnabled = process.argv.includes("--logs");
let disconnectPrisma: (() => Promise<void>) | undefined;
let prismaModuleResolutionConfigured = false;

const consoleLevels: Record<number, "log" | "warn" | "error"> = {
  0: "log",
  1: "warn",
  2: "error",
  3: "error"
};

function configureDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const dbPath = join(app.getPath("userData"), "blight.db").replace(/\\/g, "/");
  process.env.DATABASE_URL = `file:${dbPath}`;
}

function configurePrismaModuleResolution() {
  if (prismaModuleResolutionConfigured || !app.isPackaged) {
    return;
  }

  prismaModuleResolutionConfigured = true;
  const resolvableModule = Module as ResolvableModule;
  const originalResolveFilename = resolvableModule._resolveFilename;
  const unpackedNodeModulesPath = join(process.resourcesPath, "app.asar.unpacked", "node_modules");

  resolvableModule._resolveFilename = function resolvePrismaClient(request, parent, isMain, options) {
    if (request.startsWith(".prisma/client")) {
      return originalResolveFilename.call(this, join(unpackedNodeModulesPath, request), parent, isMain, options);
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#09090b",
    frame: false,
    title: "Blight",
    icon: appIconPath,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.on("console-message", (_event, ...args: unknown[]) => {
    const params =
      typeof args[0] === "object" && args[0] !== null
        ? (args[0] as { level: number; message: string; lineNumber: number; sourceId?: string })
        : {
            level: args[0] as number,
            message: args[1] as string,
            lineNumber: args[2] as number,
            sourceId: args[3] as string | undefined
          };
    const method = consoleLevels[params.level] ?? "log";
    const location = params.sourceId ? `${params.sourceId}:${params.lineNumber}` : `line ${params.lineNumber}`;
    console[method](`[renderer] ${params.message} (${location})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer] process gone: ${details.reason} (${details.exitCode})`);
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[renderer] failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
  });

  if (rendererUrl) {
    void window.loadURL(rendererUrl);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function formatStartupError(error: unknown) {
  if (error instanceof Error) {
    const parts = [error.stack || error.message];
    const cause = error.cause;

    if (cause instanceof Error) {
      parts.push(`Caused by: ${cause.stack || cause.message}`);
    } else if (cause) {
      parts.push(`Caused by: ${String(cause)}`);
    }

    return parts.join("\n");
  }

  return String(error);
}

function getWindowFromEvent(event: Electron.IpcMainInvokeEvent) {
  return BrowserWindow.fromWebContents(event.sender);
}

async function bootstrapApp() {
  try {
    configurePrismaModuleResolution();
    const inventoryService = await import("./inventory-service");
    disconnectPrisma = inventoryService.disconnectPrisma;
    const {
      adjustStaffStock,
      closeTicket,
      clearStock,
      clearHistory,
      createBulkPurchase,
      createPurchase,
      createTicket,
      deleteOpenTicket,
      getTicketAnalizerHistory,
      initializeDatabase,
      listHistory,
      listOpenTickets,
      listPurchaseInvoices,
      listPendingLeftoverCredits,
      listStaffMovements,
      listStaffStock,
      listStaffStockLots,
      listStock,
      listTickets,
      listTicketAnalizerHistory,
      saveTicketAnalizerHistory,
      sellStaffStock
    } = inventoryService;

    configureDatabaseUrl();
    await initializeDatabase();

    ipcMain.handle("stock:list", () => listStock());
    ipcMain.handle("stock:clear", () => clearStock());
    ipcMain.handle("purchase:create", (_event, input: CreatePurchaseInput) => createPurchase(input));
    ipcMain.handle("purchase:createBulk", (_event, input: CreateBulkPurchaseInput) => createBulkPurchase(input));
    ipcMain.handle("purchase:listInvoices", () => listPurchaseInvoices());
    ipcMain.handle("ticket:create", (_event, input: CreateTicketInput) => createTicket(input));
    ipcMain.handle("ticket:deleteOpen", (_event, ticketId: string) => deleteOpenTicket(ticketId));
    ipcMain.handle("ticket:list", () => listTickets());
    ipcMain.handle("ticket:listOpen", () => listOpenTickets());
    ipcMain.handle("history:list", () => listHistory());
    ipcMain.handle("history:clear", () => clearHistory());
    ipcMain.handle("leftover:listPending", (_event, tier: AppTier) => listPendingLeftoverCredits(tier));
    ipcMain.handle("ticket:close", (_event, input: CloseTicketInput) => closeTicket(input));
    ipcMain.handle("staffStock:list", () => listStaffStock());
    ipcMain.handle("staffStock:listLots", () => listStaffStockLots());
    ipcMain.handle("staffStock:listMovements", () => listStaffMovements());
    ipcMain.handle("staffStock:adjust", (_event, input: AdjustStaffStockInput) => adjustStaffStock(input));
    ipcMain.handle("staffStock:sell", (_event, input: SellStaffStockInput) => sellStaffStock(input));
    ipcMain.handle("ticketAnalizerHistory:save", (_event, input: TicketAnalizerHistoryInput) =>
      saveTicketAnalizerHistory(input)
    );
    ipcMain.handle("ticketAnalizerHistory:list", () => listTicketAnalizerHistory());
    ipcMain.handle("ticketAnalizerHistory:get", (_event, id: string) => getTicketAnalizerHistory(id));
    ipcMain.handle("window:minimize", (event) => {
      getWindowFromEvent(event)?.minimize();
    });
    ipcMain.handle("window:toggleMaximize", (event) => {
      const window = getWindowFromEvent(event);
      if (!window) {
        return false;
      }

      if (window.isMaximized()) {
        window.unmaximize();
        return false;
      }

      window.maximize();
      return true;
    });
    ipcMain.handle("window:close", (event) => {
      getWindowFromEvent(event)?.close();
    });
    ipcMain.handle("window:isMaximized", (event) => {
      return getWindowFromEvent(event)?.isMaximized() ?? false;
    });

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    if (!startupLogsEnabled) {
      throw error;
    }

    console.error(`Fatal startup error before window creation:\n${formatStartupError(error)}`);
    app.quit();
  }
}

app.whenReady().then(() => bootstrapApp());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void disconnectPrisma?.();
});
