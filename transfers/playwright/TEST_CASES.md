# Playwright Test Case Inventory

This file lists all the current Playwright test cases dynamically extracted from `playwright/tests`.

Total test cases: `48`

## `create-order-lifecycle-matrix.e2e.spec.ts`

1. `Lifecycle ${lifecycle.label}: created and approved states follow expected action logic`
2. `Lifecycle gating: Receive only hides fulfill-side actions in created state footer and meatball`
3. `Lifecycle gating: Fulfill only hides receive-side actions in footer and meatball`
4. `Approved action state persists after reload for all lifecycle options`
5. `Approve action is idempotent when triggered repeatedly`

## `create-order-negative.spec.ts`

1. `Cannot submit order without items`
2. `Cannot submit order with missing transfer name`
3. `Cannot submit order with exact same origin and destination facility`
4. `Cannot submit order with 0 item quantity`
5. `Cannot add a non-existent product`
6. `Cannot submit order with missing assignment properties`

## `create-order-positive.spec.ts`

1. `Create Fulfill & Receive transfer order with customized Ship Date`

## `order-detail-actions.spec.ts`

1. `Item-level meatball menu opens and shows at least one available action`
2. `Summary status chips are internally consistent with rendered item rows`
3. `Selecting a zero-count status filter clears the item list view`
4. `Bulk receive is disabled when selected status has no receivable items`
5. `Meatball menu redirects to external fulfill/receive apps when actions are available`
6. `Cancel action is enabled for freshly approved orders with no inventory impact`
7. `Bulk receive remains disabled until at least one eligible item is selected`
8. `Order detail status and summary chips persist after reload`

## `order-detail-add-item.spec.ts`

1. `Add Product modal opens and displays correct UI elements`

## `order-detail-bulk-actions.spec.ts`

1. `Bulk Receive: selected eligible items can be processed via modal`
2. `Select All: header checkbox selects only eligible items and becomes indeterminate when partially selected`
3. `Footer label changes for partial selection (close items vs close order)`
4. `Close fulfillment button is disabled when not currently allowed`
5. `Bulk receive is enabled when no items are selected (receives all eligible) and remains enabled when items are selected`
6. `Book QOH, Book ATP, and Custom QTY bulk actions correctly set quantities`

## `order-detail-discrepancies.spec.ts`

1. `Discrepancy filter chips successfully filter rows and toggle back to All`
2. `Inline discrepancy badge exposes a title attribute (tooltip fallback)`

## `order-detail-edit.spec.ts`

1. `Can edit the ordered quantity of an item on a Created order`
2. `Can remove an item from a Created order`
3. `Cannot set an ordered quantity below 0`

## `order-detail-receive-scenarios.spec.ts`

1. `Scenario 1 — Ordered = Shipped (0 discrepancy)`
2. `Scenario 2 — Partially shipped`
3. `Scenario 3 — Already partially received`
4. `Scenario 4 — Ordered but not shipped`
5. `Scenario 5 — Already received everything`
6. `Scenario 6 — Post-receive status (Over received)`

## `order-item-meatball-menu.spec.ts`

1. `Fulfill Only - Menu displays Fulfill/Cancel and redirects to fulfillment`
2. `Receive Only - Menu displays Receive/Cancel and redirects to receiving`
3. `Fulfill and Receive - Menu displays all options after approval and redirects correctly`

## `routing-sanity-check.spec.ts`

1. `User can switch between Transfers, Discrepancies, and Settings tabs`

## `settings.spec.ts`

1. `Settings page renders core sections`
2. `Timezone modal opens, supports search input, and can be dismissed`
3. `Verify user can logout successfully`

## `transfers-list-filters.spec.ts`

1. `Sort by toggle updates icon state and keeps data fetch healthy`
2. `Location filters (store/origin/destination) can be applied and reset`
3. `Fulfillment filters (method/carrier/type/status) can be applied and reset`

