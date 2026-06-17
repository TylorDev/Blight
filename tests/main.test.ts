import { beforeEach, describe, expect, it, vi } from "vitest";

const originalArgv = process.argv;

const expectedChannels = [
  "stock:list",
  "stock:clear",
  "purchase:create",
  "purchase:createBulk",
  "purchase:correctLine",
  "purchase:listInvoices",
  "ticket:create",
  "ticket:updateClosedMaterialCosts",
  "ticket:deleteOpen",
  "ticket:list",
  "ticket:listOpen",
  "history:list",
  "history:clear",
  "leftover:listPending",
  "ticket:close",
  "staffStock:list",
  "staffStock:listLots",
  "staffStock:listMovements",
  "staffStock:adjust",
  "staffStock:sell",
  "ticketAnalizerHistory:save",
  "ticketAnalizerHistory:list",
  "ticketAnalizerHistory:get",
  "window:minimize",
  "window:toggleMaximize",
  "window:close",
  "window:isMaximized"
];

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.ELECTRON_RENDERER_URL;
  process.argv = originalArgv;
});

describe("main process", () => {
  it("registers all expected IPC channels", async () => {
    const { ipcMain } = installMainMocks();

    await importMain();

    expect(ipcMain.handle.mock.calls.map(([channel]) => channel)).toEqual(expectedChannels);
  });

  it("creates a secure browser window and loads the renderer file by default", async () => {
    const { BrowserWindow, windows } = installMainMocks();

    await importMain();

    expect(BrowserWindow).toHaveBeenCalledTimes(1);
    expect(windows[0].options).toMatchObject({
      width: 1280,
      height: 820,
      minWidth: 980,
      minHeight: 680,
      frame: false,
      icon: expect.stringContaining("BlightAppIcon.png"),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    expect(windows[0].options.webPreferences.preload).toContain("preload");
    expect(windows[0].options.webPreferences.preload).toContain("preload.js");
    expect(windows[0].loadFile).toHaveBeenCalledWith(expect.stringContaining("renderer"));
    expect(windows[0].loadURL).not.toHaveBeenCalled();
  });

  it("loads the renderer URL when ELECTRON_RENDERER_URL is present", async () => {
    const { windows } = installMainMocks("http://localhost:5173");

    await importMain();

    expect(windows[0].loadURL).toHaveBeenCalledWith("http://localhost:5173");
    expect(windows[0].loadFile).not.toHaveBeenCalled();
  });

  it("logs startup failures before window creation when --logs is present", async () => {
    process.argv = [...originalArgv, "--logs"];
    const startupError = new Error("Cannot find module '.prisma/client/default'");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { BrowserWindow, app } = installMainMocks({ initializeDatabaseError: startupError });

    await importMain();

    expect(BrowserWindow).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Fatal startup error before window creation:")
    );
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(startupError.message));
    expect(app.quit).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it("logs inventory-service import failures before window creation when --logs is present", async () => {
    process.argv = [...originalArgv, "--logs"];
    const startupError = new Error("Cannot find module '.prisma/client/default'");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { BrowserWindow, app } = installMainMocks({ inventoryServiceImportError: startupError });

    await importMain();

    expect(BrowserWindow).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Fatal startup error before window creation:")
    );
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(startupError.message));
    expect(app.quit).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it("rethrows startup failures before window creation without --logs", async () => {
    const startupError = new Error("Cannot find module '.prisma/client/default'");
    const { BrowserWindow, startup } = installMainMocks({ initializeDatabaseError: startupError });

    await importMain();

    await expect(startup.promise).rejects.toThrow(startupError);
    expect(BrowserWindow).not.toHaveBeenCalled();
  });
});

type MainMockOptions =
  | string
  | {
      rendererUrl?: string;
      initializeDatabaseError?: Error;
      inventoryServiceImportError?: Error;
    };

function installMainMocks(options?: MainMockOptions) {
  const rendererUrl = typeof options === "string" ? options : options?.rendererUrl;
  const initializeDatabaseError = typeof options === "string" ? undefined : options?.initializeDatabaseError;
  const inventoryServiceImportError = typeof options === "string" ? undefined : options?.inventoryServiceImportError;

  if (rendererUrl) {
    process.env.ELECTRON_RENDERER_URL = rendererUrl;
  }

  const startup: { promise?: Promise<unknown> } = {};
  const ipcMain = {
    handle: vi.fn()
  };
  const app = {
    whenReady: vi.fn(() => ({
      then: vi.fn((onReady: () => unknown) => {
        startup.promise = Promise.resolve().then(onReady);
        return startup.promise;
      })
    })),
    getPath: vi.fn(() => "C:\\Users\\Jimbo\\AppData\\Roaming\\Blight"),
    on: vi.fn(),
    quit: vi.fn()
  };
  const windows: Array<{
    options: {
      width: number;
      height: number;
      minWidth: number;
      minHeight: number;
      frame: boolean;
      icon: string;
      webPreferences: {
        preload: string;
        contextIsolation: boolean;
        nodeIntegration: boolean;
      };
    };
    webContents: { on: ReturnType<typeof vi.fn> };
    loadURL: ReturnType<typeof vi.fn>;
    loadFile: ReturnType<typeof vi.fn>;
  }> = [];
  const BrowserWindow = vi.fn(function BrowserWindow(options) {
    const window = {
      options,
      webContents: { on: vi.fn() },
      loadURL: vi.fn(() => Promise.resolve()),
      loadFile: vi.fn(() => Promise.resolve())
    };
    windows.push(window);
    return window;
  });
  Object.assign(BrowserWindow, {
    getAllWindows: vi.fn(() => windows)
  });

  vi.doMock("electron", () => ({ app, BrowserWindow, ipcMain }));
  vi.doMock("../electron/inventory-service", () => {
    if (inventoryServiceImportError) {
      throw inventoryServiceImportError;
    }

    return {
      adjustStaffStock: vi.fn(),
      closeTicket: vi.fn(),
      clearHistory: vi.fn(),
      clearStock: vi.fn(),
      createBulkPurchase: vi.fn(),
      createPurchase: vi.fn(),
      correctPurchaseInvoiceLine: vi.fn(),
      listPurchaseInvoices: vi.fn(),
      createTicket: vi.fn(),
      updateClosedTicketMaterialCosts: vi.fn(),
      deleteOpenTicket: vi.fn(),
      disconnectPrisma: vi.fn(),
      initializeDatabase: vi.fn(() => {
        if (initializeDatabaseError) {
          return Promise.reject(initializeDatabaseError);
        }

        return Promise.resolve();
      }),
      listHistory: vi.fn(),
      listOpenTickets: vi.fn(),
      listPendingLeftoverCredits: vi.fn(),
      listStaffMovements: vi.fn(),
      listStaffStock: vi.fn(),
      listStaffStockLots: vi.fn(),
      listStock: vi.fn(),
      listTickets: vi.fn(),
      listTicketAnalizerHistory: vi.fn(),
      saveTicketAnalizerHistory: vi.fn(),
      getTicketAnalizerHistory: vi.fn(),
      sellStaffStock: vi.fn()
    };
  });

  return { app, BrowserWindow, ipcMain, windows, startup };
}

async function importMain() {
  await import("../electron/main");
  await new Promise((resolve) => setTimeout(resolve, 0));
}
