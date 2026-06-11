# Blight Product Requirements Document

## 1. Product Summary

Blight is an Electron desktop application for tracking crafting economics across purchases, inventory, fabrication tickets, production results, XL ticket analysis, and market price comparison.

The product helps a crafting-focused user answer a practical business question: given the materials purchased, current stock costs, crafting taxes, leftovers, and produced staff quality distribution, was a crafting run profitable and where should future purchases be sourced?

Blight is designed around a closed operational loop:

1. Register material purchases.
2. Maintain weighted stock cost by material and tier.
3. Create fabrication tickets from stock cost assumptions.
4. Close tickets with real production results.
5. Analyze XL batches across T5, T6, T7, and T8.
6. Compare market prices to improve future buying decisions.

## 2. Target User And Problem

### Target User

The primary user is a player or operator managing Albion-style crafting batches where profitability depends on:

- Material purchase prices.
- Material tier.
- Recipe selection.
- Crafting tax.
- Returned or leftover materials.
- Produced item quantity and quality.
- Expected resale value by item power.
- Market-specific price differences.

### Problem

Crafting profitability is difficult to track manually because costs and returns are distributed across several steps. Purchases change average inventory cost, ticket creation estimates investment, ticket closing consumes stock and records actual output, and final profit depends on sale assumptions and taxes.

Blight centralizes those steps so the user can make decisions from consistent inventory, ticket, and analysis data instead of spreadsheets or manual notes.

## 3. Product Scope

### In Scope

- Register individual and bulk material purchases.
- Track inventory quantity, total investment, and average cost.
- Show purchase invoice history.
- Create fabrication tickets using supported recipes, tiers, tax, stock costs, and leftovers.
- Create TicketXL batches across T5, T6, T7, and T8.
- Manage open tickets.
- Close tickets with stock validation, production quantities, filled journals, and leftovers.
- Maintain closed ticket history and produced staff stock.
- Analyze four-ticket XL batches for revenue, costs, taxes, and profit.
- Save TicketAnalizer history snapshots.
- Compare prices across configured markets without mutating inventory.

### Out Of Scope

- External marketplace integrations.
- Automatic live price imports.
- Multi-user collaboration.
- Cloud sync.
- Features not represented by the current Electron, Zustand, and `window.blight` API behavior.

## 4. Main Modules

### Purchases And Invoices

Relevant UI:

- `BuyPage`
- `PurchaseDialog`

The purchase flow lets the user register material purchases by category, tier, quantity, total price, average price, and vendor. Purchase creation updates inventory and purchase invoice history.

`BuyPage` displays:

- Total invested across all invoices.
- Total invoice count.
- A list of invoices.
- Invoice details including date, client, vendor, line items, subtotal, payment state, and purchase type.

Purchase invoices are read-only operational records. They represent the historical evidence behind stock investment.

### Inventory And Investment Summaries

Relevant UI:

- `StockTab`

The stock module displays the current material inventory. It supports filtering by category and tier, and shows investment summaries grouped by material category and tier.

Each stock item exposes:

- Category.
- Tier.
- Quantity.
- Total invested value.
- Average cost.

Selecting a stock row opens `PurchaseDialog` prefilled with the row category, tier, and average cost so the user can quickly register another similar purchase.

### Ticket Creation And Cost Preview

Relevant UI:

- `TicketDialog`

The ticket creation flow creates an open fabrication ticket. The user can choose:

- Tier: T5, T6, T7, or T8.
- Recipe: Recipe 1 or Recipe 2.
- Crafting tax.
- Optional manual leftovers for boards and cloths when no pending automatic leftovers exist.

The dialog previews:

- Required effective recipe materials.
- Staff quantity.
- Focus cost.
- Material total.
- Crafting tax.
- Total investment.
- Unit cost.

Ticket preview calculations use current stock average costs. Pending leftover credits are loaded by tier and applied before ticket creation. Manual leftovers use current stock average costs for boards and cloths.

### TicketXL Creation

Relevant UI:

- `TicketDialogXL`

TicketXL is a guided batch creation flow. The user selects one recipe and one global tax, then Blight creates four tickets in sequence:

1. T5
2. T6
3. T7
4. T8

Each generated ticket uses:

- The selected recipe.
- The selected tax.
- A fixed tier for the current step.
- The `XL` ticket ID prefix.

After all four tickets are created, Blight saves an initial TicketAnalizer history snapshot with the four ticket IDs and default analyzer state. If the tickets are created but the snapshot fails, the UI reports that the XL tickets exist while the HistoryXL snapshot is pending or failed.

### Open Tickets And Production Closing

Relevant UI:

- `TicketTab`
- `CloseTicketDialog`

`TicketTab` lists open tickets and displays investment consumed by closed tickets, grouped by material and tier.

For each open ticket, the user can:

- Review ticket costs.
- Review the effective recipe.
- Close the ticket.
- Delete the open ticket.

Deleting an open ticket removes the ticket and its applied leftovers from open ticket state. It does not modify stock or history.

`CloseTicketDialog` records actual production results:

- Filled journal quantity.
- Filled journal discount.
- Leftover board quantity.
- Leftover cloth quantity.
- Produced staff quantities by quality.

Closing validates that:

- The required stock is available.
- Board and cloth leftovers are greater than zero.
- Produced staff quantities sum exactly to the ticket staff quantity.

On successful close, Blight refreshes:

- Open tickets.
- Stock.
- Closed ticket history.
- Staff stock.
- Staff lots.
- Staff movements.

### XL Profitability Analysis

Relevant UI:

- `TicketAnalizer`

TicketAnalizer calculates profitability for a four-ticket batch. It can operate in two modes:

- Automatic XL mode: selects the latest four closed tickets whose IDs start with `XL-`.
- Manual mode: uses exactly four user-entered ticket IDs.

The analyzer requires:

- Four closed tickets.
- One ticket for each supported tier.
- No duplicate selected tickets.

It calculates:

- Total cost.
- Gross sale.
- Profit before taxes.
- Taxes and fees.
- Net profit.
- Total produced quantity.
- Profit by item power.
- Profit by tier.
- Profit by quality.
- Detail by tier and quality.

The analyzer lets the user override:

- Sale value by item power.
- Sale value exceptions for specific tier and quality combinations.
- Sale order tax percentage.
- Sale tax percentage.
- Unit cost per ticket while editing.
- Produced quantity by ticket and quality while editing.

When unit cost or produced quantities are edited, Blight classifies the saved analyzer snapshot as edited and not accounting-valid because the real ticket data has been modified for analysis purposes.

### Market Price Comparator

Relevant UI:

- `PriceComparatorPage`

The price comparator is a standalone decision-support tool. It does not modify inventory, purchases, tickets, or history.

The user can:

- Add individual materials.
- Add template groups by category.
- Compare prices across markets.
- Choose market ordering direction.
- Search for lowest or highest price.
- Use simple mode with direct unit prices.
- Use advanced mode with total price and quantity, deriving average unit price.

The comparator highlights the best and second-best markets for each material according to the selected mode.

## 5. Core Data Entities

### `StockItemView`

Represents current inventory for a material category and tier.

Key fields:

- `category`
- `tier`
- `quantity`
- `total`
- `averageCost`

Used by:

- Stock display.
- Purchase continuation.
- Ticket cost preview.
- Manual leftover value estimation.

### `PurchaseInvoiceView`

Represents a purchase invoice and its line items.

Key fields:

- `number`
- `type`
- `vendor`
- `client`
- `total`
- `createdAt`
- `lines`

Used by:

- Buy page summary.
- Invoice detail modal.
- Historical purchase review.

### `FabricationTicketView`

Represents a crafting ticket from creation through closure.

Key fields:

- `id`
- `tier`
- `status`
- `recipeId`
- `tax`
- `staffQuantity`
- `focusCost`
- `craftingTax`
- `materialTotal`
- `investmentTotal`
- `unitCost`
- `openedAt`
- `closedAt`
- `consumptions`
- `appliedLeftoverCredits`
- `producedStaffs`

Used by:

- Ticket creation.
- Open ticket display.
- Ticket closing.
- History.
- TicketAnalizer.

### `LeftoverCreditView`

Represents leftover board or cloth credit from a previous closed ticket.

Key fields:

- `tier`
- `category`
- `quantity`
- `value`
- `sourceTicketId`
- `appliedToTicketId`
- `createdAt`
- `appliedAt`

Used by:

- Automatic leftover application during ticket creation.
- Effective recipe calculation.
- Ticket preview discounts.

### `TicketAnalizerHistoryView`

Represents a saved analyzer snapshot.

Key fields:

- `ticketIds`
- `manualState`
- `summary`
- `isAccountingValid`
- `isEdited`
- `mutationType`
- `invalidationReason`
- `sourceSnapshotId`
- `createdAt`

Used by:

- TicketXL initial snapshot.
- TicketAnalizer save/load.
- HistoryXL review.

## 6. Business Rules

### Supported Tiers

Blight supports four crafting tiers:

- T5
- T6
- T7
- T8

### Inventory Categories

Blight tracks four material categories:

- Boards
- Cloths
- Empty Journals
- Artifacts

### Staff Qualities

Produced staff can be recorded in the following qualities:

- Normal
- Good
- Outstanding
- Excellent
- Masterpiece

### Recipes

Blight supports two ticket recipes.

Recipe 1:

- Produces 6 staff.
- Requires 73 boards.
- Requires 44 cloths.
- Requires 6 artifacts.
- Requires empty journals by tier:
  - T5: 19
  - T6: 14
  - T7: 8
  - T8: 4

Recipe 2:

- Produces 7 staff.
- Requires 83 boards.
- Requires 50 cloths.
- Requires 7 artifacts.
- Requires empty journals by tier:
  - T5: 22
  - T6: 16
  - T7: 10
  - T8: 5

Recipe 2 is the default recipe.

### Ticket Cost Preview

Ticket preview must calculate:

- Effective materials after applying leftovers.
- Material subtotal per category.
- Material total.
- Staff quantity.
- Focus cost.
- Crafting tax per staff.
- Total crafting tax.
- Investment total.
- Unit cost.

Focus cost is calculated as staff quantity multiplied by 1,005.

Crafting tax uses:

- User-entered or default tax.
- A base tax value.
- A tier multiplier.
- Staff quantity.

### Default Values

Ticket tax defaults to the tax from the latest closed ticket. If no closed ticket exists, the default tax is 1.

Filled journal quantity defaults to the recipe journal quantity for the ticket tier.

Filled journal discount defaults to the latest closed ticket discount for the same tier, or zero if unavailable.

Leftover suggestions are derived from recent closed tickets for the same tier.

### Leftovers

Automatic leftover credits are loaded by tier when a ticket dialog is opened.

If pending leftover credits exist:

- They are displayed to the user.
- They are applied automatically to the effective recipe.
- Manual leftover entry is disabled.

If no pending leftover credits exist:

- The user may enable manual leftovers.
- Manual leftovers may only apply to boards and cloths.
- Manual leftover value uses current stock average cost.

### Ticket Closing

Before closing a ticket, Blight must validate:

- Board leftovers are greater than zero.
- Cloth leftovers are greater than zero.
- Produced staff quantities sum exactly to the ticket staff quantity.
- Required stock is available.

If stock is missing, the close operation returns a structured list of missing materials instead of silently closing the ticket.

### TicketAnalizer Selection

TicketAnalizer requires exactly four closed tickets.

Automatic XL mode selects the latest four closed tickets whose IDs start with `XL-`.

Manual mode requires exactly four ticket IDs entered by the user.

The selected tickets must:

- Exist.
- Be closed.
- Be unique.
- Include T5, T6, T7, and T8.

### TicketAnalizer Profit

TicketAnalizer calculates revenue using sale values by item power, with configured exceptions for specific tier and quality combinations.

Net profit is calculated from:

- Gross sale.
- Total cost.
- Sale order tax percentage.
- Sale tax percentage.

### TicketAnalizer History Validity

Saving analyzer changes preserves a manual state and financial summary.

If the user changes sale values or tax assumptions without changing real ticket data, the snapshot can remain accounting-valid.

If the user edits unit cost or produced quantities, the snapshot must be marked:

- `isEdited: true`
- `isAccountingValid: false`
- `invalidationReason: REAL_TICKET_DATA_MODIFIED`

## 7. System Connections

Blight uses Zustand stores in the renderer and `window.blight` APIs exposed through Electron preload to mutate and read persisted data.

### Purchase To Stock

Creating a purchase calls the stock store. On success:

- Stock is reloaded.
- Purchase invoices are reloaded.

This keeps `StockTab` and `BuyPage` aligned.

### Stock To Tickets

Ticket creation uses current stock average costs to estimate material cost and unit cost.

Stock is not consumed when the ticket is created. Stock validation and consumption happen when the ticket is closed.

### Tickets To History

Open tickets are listed separately from closed ticket history.

Closing a ticket moves it into closed history, records material consumption, creates leftover credits, and records produced staff.

### TicketXL To TicketAnalizer

TicketXL creates four open tickets with the `XL` prefix. After the fourth ticket is created, Blight saves an analyzer history record containing the four ticket IDs and a default analyzer state.

Once those tickets are closed, TicketAnalizer can automatically analyze the latest closed XL set.

### TicketAnalizer To HistoryXL

TicketAnalizer can load a saved history record by `historyId`. It applies the saved manual state, selected ticket IDs, sale assumptions, tax assumptions, unit cost drafts, and quantity drafts.

Saving from TicketAnalizer writes a new or updated analyzer history snapshot.

### Price Comparator Isolation

PriceComparator is intentionally isolated. It supports decision-making but does not call inventory, ticket, or purchase mutation APIs.

## 8. User Experience Requirements

- Forms should use localized number input behavior already present in the app.
- Currency and quantities should be formatted consistently.
- Destructive operations should require confirmation.
- Ticket creation should show cost preview before submission.
- Ticket closing should explain validation failures clearly.
- Analyzer errors should identify missing, duplicate, open, or incomplete ticket selections.
- Empty states should explain what action is needed next.
- Price comparison should make best and second-best markets visually distinguishable.

## 9. Acceptance Criteria

- `PRD.MD` exists at the repository root.
- The PRD is written entirely in English.
- The PRD accurately documents the behavior represented by the current referenced components.
- The PRD explains how purchases, stock, tickets, TicketXL, TicketAnalizer, and PriceComparator connect.
- The PRD documents the key data entities and business rules used by those flows.
- The PRD does not describe external integrations or future features that are not present in the inspected code.
- The PRD is useful for product alignment, QA, onboarding, and future implementation planning.

## 10. Assumptions

- This document describes the current product behavior, not a future roadmap.
- Blight is operated by a single local desktop user.
- The Electron `window.blight` API is the source of truth for persisted mutations.
- The current supported tiers, categories, qualities, recipes, and analysis rules are fixed unless future work explicitly changes them.
