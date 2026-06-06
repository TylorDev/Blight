import { beforeEach, describe, expect, it } from "vitest";
import type { AppTier, Category } from "../../electron/types";
import { useTicketStore } from "../../src/stores/ticket-store";
import { createLeftoverCredit, createTicket, installBlightMock } from "./mock-blight";

let blight: ReturnType<typeof installBlightMock>;

beforeEach(() => {
  blight = installBlightMock();
  useTicketStore.setState({
    tickets: [],
    loading: false,
    error: null,
    missingMaterials: []
  });
});

describe("ticket-store", () => {
  it("loads open tickets from window.blight", async () => {
    const tickets = [createTicket()];
    blight.listOpenTickets.mockResolvedValue(tickets);

    await useTicketStore.getState().loadTickets();

    expect(blight.listOpenTickets).toHaveBeenCalledTimes(1);
    expect(useTicketStore.getState().tickets).toEqual(tickets);
    expect(useTicketStore.getState().loading).toBe(false);
  });

  it("stores and rethrows load ticket errors and clears loading", async () => {
    const failure = new Error("tickets unavailable");
    blight.listOpenTickets.mockRejectedValue(failure);

    await expect(useTicketStore.getState().loadTickets()).rejects.toThrow("tickets unavailable");

    expect(useTicketStore.getState().error).toBe("tickets unavailable");
    expect(useTicketStore.getState().loading).toBe(false);
  });

  it("creates a ticket, clears missing materials, and refreshes open tickets", async () => {
    const tickets = [createTicket({ id: "ticket-2" })];
    useTicketStore.getState().setMissingMaterials(["Tablas T5 (0/73)"]);
    blight.createTicket.mockResolvedValue(createTicket());
    blight.listOpenTickets.mockResolvedValue(tickets);

    await useTicketStore.getState().createTicket({ tier: "T5" as AppTier, tax: 100 });

    expect(blight.createTicket).toHaveBeenCalledWith({ tier: "T5", tax: 100 });
    expect(blight.listOpenTickets).toHaveBeenCalledTimes(1);
    expect(useTicketStore.getState().missingMaterials).toEqual([]);
    expect(useTicketStore.getState().tickets).toEqual(tickets);
  });

  it("clears missing materials and rethrows create ticket errors without refreshing tickets", async () => {
    const failure = new Error("create failed");
    useTicketStore.getState().setMissingMaterials(["Tablas T5 (0/73)"]);
    blight.createTicket.mockRejectedValue(failure);

    await expect(useTicketStore.getState().createTicket({ tier: "T5" as AppTier, tax: 100 })).rejects.toThrow(
      "create failed"
    );

    expect(useTicketStore.getState().missingMaterials).toEqual([]);
    expect(useTicketStore.getState().error).toBe("create failed");
    expect(blight.listOpenTickets).not.toHaveBeenCalled();
  });

  it("deletes an open ticket, clears missing materials, and refreshes open tickets", async () => {
    const remainingTickets = [createTicket({ id: "ticket-2" })];
    useTicketStore.getState().setMissingMaterials(["Tablas T5 (0/73)"]);
    blight.deleteOpenTicket.mockResolvedValue(undefined);
    blight.listOpenTickets.mockResolvedValue(remainingTickets);

    await useTicketStore.getState().deleteOpenTicket("ticket-1");

    expect(blight.deleteOpenTicket).toHaveBeenCalledWith("ticket-1");
    expect(blight.listOpenTickets).toHaveBeenCalledTimes(1);
    expect(useTicketStore.getState().missingMaterials).toEqual([]);
    expect(useTicketStore.getState().tickets).toEqual(remainingTickets);
  });

  it("closes a ticket successfully and refreshes open tickets", async () => {
    const remainingTickets = [createTicket({ id: "ticket-2" })];
    const closedTicket = createTicket({ status: "CERRADO", closedAt: "2026-01-01T01:00:00.000Z" });
    blight.closeTicket.mockResolvedValue({ ok: true, ticket: closedTicket });
    blight.listOpenTickets.mockResolvedValue(remainingTickets);

    const result = await useTicketStore.getState().closeTicket({
      ticketId: "ticket-1",
      filledDiariesQuantity: 0,
      filledDiariesDiscount: 0,
      leftoverTablesQuantity: 0,
      leftoverClothsQuantity: 0,
      producedStaffs: [{ quality: "NORMAL", quantity: 6 }]
    });

    expect(result).toEqual({ ok: true, ticket: closedTicket });
    expect(blight.closeTicket).toHaveBeenCalledTimes(1);
    expect(blight.listOpenTickets).toHaveBeenCalledTimes(1);
    expect(useTicketStore.getState().tickets).toEqual(remainingTickets);
  });

  it("stores formatted missing materials when close fails", async () => {
    blight.closeTicket.mockResolvedValue({
      ok: false,
      missing: [
        {
          category: "TABLAS" as Category,
          tier: "T5" as AppTier,
          required: 73,
          available: 0
        },
        {
          category: "TELAS" as Category,
          tier: "T5" as AppTier,
          required: 44,
          available: 10
        },
        {
          category: "ARTEFACTOS" as Category,
          tier: "T5" as AppTier,
          required: 6,
          available: 2
        }
      ]
    });

    const result = await useTicketStore.getState().closeTicket({
      ticketId: "ticket-1",
      filledDiariesQuantity: 0,
      filledDiariesDiscount: 0,
      leftoverTablesQuantity: 0,
      leftoverClothsQuantity: 0,
      producedStaffs: [{ quality: "NORMAL", quantity: 6 }]
    });

    expect(result.ok).toBe(false);
    expect(blight.listOpenTickets).not.toHaveBeenCalled();
    expect(useTicketStore.getState().missingMaterials).toEqual([
      "Tablas T5 (0/73)",
      "Telas T5 (10/44)",
      "Artefactos T5 (2/6)"
    ]);
  });

  it("delegates pending leftover credit loading", async () => {
    const credits = [createLeftoverCredit()];
    blight.listPendingLeftoverCredits.mockResolvedValue(credits);

    await expect(useTicketStore.getState().listPendingLeftoverCredits("T5" as AppTier)).resolves.toEqual(credits);

    expect(blight.listPendingLeftoverCredits).toHaveBeenCalledWith("T5");
  });

  it("stores and rethrows close errors", async () => {
    const failure = new Error("close failed");
    blight.closeTicket.mockRejectedValue(failure);

    await expect(
      useTicketStore.getState().closeTicket({
        ticketId: "ticket-1",
        filledDiariesQuantity: 0,
        filledDiariesDiscount: 0,
        leftoverTablesQuantity: 0,
        leftoverClothsQuantity: 0,
        producedStaffs: [{ quality: "NORMAL", quantity: 6 }]
      })
    ).rejects.toThrow("close failed");

    expect(useTicketStore.getState().error).toBe("close failed");
  });

  it("stores and rethrows delete errors", async () => {
    const failure = new Error("delete failed");
    blight.deleteOpenTicket.mockRejectedValue(failure);

    await expect(useTicketStore.getState().deleteOpenTicket("ticket-1")).rejects.toThrow("delete failed");

    expect(useTicketStore.getState().error).toBe("delete failed");
  });
});
