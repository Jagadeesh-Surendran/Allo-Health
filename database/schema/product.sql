-- product table
CREATE TABLE IF NOT EXISTS product (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  sku text UNIQUE NOT NULL
);
