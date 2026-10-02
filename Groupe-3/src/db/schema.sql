-- Schéma de données du module Groupe 3 (Panier, commandes et livraison)
-- Montants en entiers (FCFA), dates au format ISO 8601.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS carts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id    INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT    NOT NULL,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          TEXT    NOT NULL,
  status           TEXT    NOT NULL CHECK (status IN
                   ('PENDING','CONFIRMED','PREPARING','SHIPPED','DELIVERED','CANCELLED','REFUNDED')),
  total            INTEGER NOT NULL CHECK (total >= 0),
  shipping_address TEXT    NOT NULL,
  payment_method   TEXT    NOT NULL CHECK (payment_method IN ('MOBILE_MONEY','CARD','CASH_ON_DELIVERY')),
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT    NOT NULL,
  product_name TEXT    NOT NULL,
  unit_price   INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity     INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT    NOT NULL,
  changed_by  TEXT    NOT NULL,
  changed_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id  INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  number    TEXT    NOT NULL UNIQUE,
  total     INTEGER NOT NULL,
  issued_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  status       TEXT    NOT NULL CHECK (status IN ('PENDING','SHIPPED','DELIVERED')),
  shipped_at   TEXT,
  delivered_at TEXT,
  updated_by   TEXT
);

CREATE TABLE IF NOT EXISTS refunds (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  amount     INTEGER NOT NULL,
  reason     TEXT,
  created_by TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
