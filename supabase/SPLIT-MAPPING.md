# Polybag split — inventory & mapping (step 1)

Source: project `jylkzihuozugqfjqvhhe` (ap-southeast-2), PostgreSQL 17.6, read-only inventory taken 2026-10-29.
Raw data: `supabase/inventory.json` (regenerate with `node src/scripts/split/inventory.js`).

Company ids:
- **MAXTRON (Polybag)** `739f66c9-4f5a-428f-984e-ac9e2e689b59`
- **KEIL** `5be36c2a-c42e-4469-8551-115ede9ca728`

73 public tables, 3 views (`v_marketing_visits_report`, `v_purchase_entry_balances`, `v_sales_invoice_balances`), 146 FKs, 72 RLS policies (RLS enabled on 71 tables), extensions: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `postgres_fdw`, `supabase_vault`, `plpgsql`. `auth.users` = 0, `storage.objects` = 0 (confirmed unused).

## Classification

### Copy whole (no company scoping)
| table | rows | note |
|---|---|---|
| permissions | 50 | shared permission catalog |
| departments | 0 | no company column |
| announcements | 0 | has `tenant` text col; empty |
| inventory | 0 | legacy, empty |

### Split by company_id (keep MAXTRON + NULL-company rows)
| table | total | MAXTRON | KEIL | NULL |
|---|---|---|---|---|
| users | 47 | 15 | 32 | 0 |
| user_types | 19 | 7 | 12 | 0 |
| employee_categories | 16 | 4 | 7 | 5 (copy the 5 shared) |
| employee_payroll | 1 | 1 | 0 | 0 |
| attendance | 1 | 0 | 1 | 0 |
| customers | 136 | 136 | 0 | 0 |
| finished_products | 108 | 77 | 31 | 0 |
| raw_materials | 24 | 24 | 0 | 0 |
| rm_type_codes | 23 | 23 | 0 | 0 |
| supplier_master | 8 | 8 | 0 | 0 |
| marketing_visits | 166 | 166 | 0 | 0 |
| marketing_visit_outcomes | 9 | 1 | 0 | 8 (shared master list — copy) |
| customer_orders | 4 | 4 | 0 | 0 |
| sales_invoices | 3 | 3 | 0 | 0 |
| sales_returns | 1 | 1 | 0 | 0 |
| production_batches | 3 | 3 | 0 | 0 |
| production_conversions | 4 | 4 | 0 | 0 |
| production_wastage | 15 | 15 | 0 | 0 |
| trading_goods_inward | 26 | 26 | 0 | 0 |
| vehicles | 1 | 1 | 0 | 0 |
| marketing_offers, hr_expenditures, hr_expense_heads, petty_cash, customer_collections, supplier_payments, purchase_entries, purchase_returns, rm_orders, material_consumptions, deliveries, production_expenses, production_packing, production_printing, vendor_registry, customer_collection_allocations, supplier_payment_allocations | 0 | — | — | all empty |

### Split by parent (no company_id; follow FK)
| table | parent (FK) | Polybag rows |
|---|---|---|
| customer_order_items | customer_orders | 5 |
| sales_invoice_items | sales_invoices | 4 |
| sales_return_items | sales_returns | 1 |
| production_conversion_items | production_conversions | 4 |
| production_batch_items | production_batches | 7 |
| supplier_materials | supplier_master | 9 |
| role_permissions | user_types (`role_id`) | 207 (KEIL 127) |
| delivery_items, rm_order_items, purchase_entry_items | parents empty | 0 |
| employee_qualifications/experiences/certificates/licenses/loans/suspenses/targets/incentive_slabs/insurances | users (`employee_id`) | 0 linked (see open Q2) |

### addresses (288) — mixed linkage, split by owner
| owner | rows | action |
|---|---|---|
| customer → Polybag customer | 146 | copy |
| user → Polybag user | 28 | copy |
| company_id = MAXTRON direct | 3 | copy |
| referenced by Polybag supplier_master (supplier/billing address) | 16 | copy |
| user/company → KEIL | 67 | skip |
| unlinked & unreferenced | 28 | skip (open Q1) |

→ **193 Polybag address rows** expected on the new project.

### KEIL-only (create structure, copy no rows)
keil_branches, keil_hces, keil_routes, keil_route_assignments, keil_collection_headers, keil_collection_entries, keil_vehicles, keil_vehicle_logs, keil_vehicle_repairs, keil_fuel_filling — all 182 collection entries belong to KEIL headers; nothing Polybag anywhere in keil_*.

## Cross-company reference checks (all clean)
- 0 Polybag order/invoice/return/batch/trading rows reference a KEIL product.
- 0 Polybag marketing visits reference a KEIL customer.
- 0 Polybag users have `branch_id` or `branch_ids` set (the FK to keil_branches stays satisfiable).
- Polybag users' `category_id` points only at MAXTRON or shared (NULL) categories.

## Sequences to carry over (values at inventory time)
collection_voucher_seq=4, cutting_no_seq=20, delivery_no_seq=2, employee_code_seq=1131, invoice_no_seq=4, order_no_seq=10, payment_voucher_seq=4, petty_cash_voucher_seq=5, sales_return_no_seq=4; consumption_slip_no_seq and purchase_entry_no_seq never used. Document numbering (INV-/ORD-/CUT-…) continues only if these are set on the new project — the copy script must sync them from source values, not max(id) (ids are UUIDs).

## Money totals (source of truth for the verify step)
- sales_invoices (MAXTRON) net_amount: **41,292.00**
- customer_orders net_amount: 45,489.00
- purchase_entries / customer_collections / supplier_payments: 0

## Grants & RLS
All of anon/authenticated/service_role hold full table privileges; RLS enabled on 71 tables with 72 permissive policies. `pg_dump --schema-only` carries RLS + policies; grants are re-checked and fixed after apply (step 2d).

## Open questions (checkpoint 1)
1. **28 unlinked, unreferenced addresses** — no user, customer, company, or supplier points at them. Default: leave them behind as dead rows.
2. **41 employee child rows with `employee_id` NULL** (qualifications 11, experiences 9, certificates 6, insurances 6, licenses 4, loans 2, suspenses/targets/incentive_slabs 1 each) — unattributable to a company. Default: leave them out of Polybag; the only *linked* rows (9 licenses) are KEIL's.
3. **finished_products drift**: 77 MAXTRON rows now (brief said 72) — live data moved on; 77 is taken as correct.
4. **2 Polybag users have `type` NULL** — they copy fine; noted because role-based screens may treat them oddly (already true in production).
