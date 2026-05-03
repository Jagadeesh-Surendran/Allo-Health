-- Enforce stock invariants at the DB level.
-- These fire BEFORE any trigger or application code.
-- If violated, the entire transaction rolls back.

ALTER TABLE "StockLevel"
  ADD CONSTRAINT stock_total_non_negative
    CHECK (total >= 0),
  ADD CONSTRAINT stock_reserved_non_negative
    CHECK (reserved >= 0),
  ADD CONSTRAINT stock_reserved_lte_total
    CHECK (reserved <= total);

ALTER TABLE "Reservation"
  ADD CONSTRAINT reservation_quantity_positive
    CHECK (quantity > 0);