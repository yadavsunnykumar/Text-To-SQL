"""Creates a small, deterministic e-commerce SQLite database to try the analyst on.

Run directly to (re)build it:   python -m app.db.seed --force
"""
import argparse
import datetime as dt
import random
import sqlite3
from pathlib import Path

from app.core.config import DEFAULT_SQLITE_PATH

SCHEMA = """
CREATE TABLE categories (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    price       REAL NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE customers (
    id          INTEGER PRIMARY KEY,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    city        TEXT NOT NULL,
    country     TEXT NOT NULL,
    signup_date DATE NOT NULL
);

CREATE TABLE orders (
    id          INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    order_date  DATE NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled', 'returned'))
);

CREATE TABLE order_items (
    id          INTEGER PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL,
    unit_price  REAL NOT NULL
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_items_order ON order_items(order_id);
CREATE INDEX idx_items_product ON order_items(product_id);
"""

CATEGORIES = ["Electronics", "Books", "Home & Kitchen", "Fashion", "Sports", "Beauty", "Toys", "Groceries"]

PRODUCTS = {
    "Electronics": [("Wireless Earbuds", 2499), ("Smartphone X", 24999), ("Bluetooth Speaker", 3499),
                    ("Laptop Pro 14", 89999), ("Smart Watch", 7999), ("USB-C Charger", 1299)],
    "Books": [("Clean Code", 650), ("Designing Data-Intensive Applications", 1499),
              ("The Pragmatic Programmer", 899), ("Atomic Habits", 499), ("Sapiens", 599)],
    "Home & Kitchen": [("Air Fryer", 6999), ("Pressure Cooker 5L", 2299), ("Coffee Maker", 4599),
                       ("Non-stick Pan Set", 2799), ("Water Purifier", 12999)],
    "Fashion": [("Denim Jacket", 2999), ("Running Shoes", 4499), ("Cotton Kurta", 1199),
                ("Leather Wallet", 899), ("Sunglasses", 1599)],
    "Sports": [("Yoga Mat", 999), ("Cricket Bat", 3499), ("Football", 1199), ("Dumbbell Set 10kg", 2599),
               ("Badminton Racket", 1799)],
    "Beauty": [("Face Wash", 299), ("Sunscreen SPF 50", 549), ("Hair Dryer", 1899), ("Perfume", 2499)],
    "Toys": [("Building Blocks", 1499), ("Remote Control Car", 2199), ("Puzzle 1000 pcs", 799)],
    "Groceries": [("Basmati Rice 5kg", 649), ("Green Tea 100 bags", 399), ("Almonds 1kg", 999),
                  ("Olive Oil 1L", 899)],
}

FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Ananya", "Diya", "Isha", "Rohan", "Priya", "Kabir", "Meera",
               "Arjun", "Sneha", "Rahul", "Neha", "Vikram", "Pooja", "Sam", "Emma", "Liam", "Olivia",
               "Noah", "Sofia", "Yuki", "Hans", "Fatima"]
LAST_NAMES = ["Sharma", "Patel", "Gupta", "Reddy", "Iyer", "Khan", "Singh", "Mehta", "Nair", "Das",
              "Smith", "Johnson", "Brown", "Garcia", "Muller", "Tanaka", "Ali"]
CITIES = [("Mumbai", "India"), ("Bengaluru", "India"), ("Delhi", "India"), ("Pune", "India"),
          ("Hyderabad", "India"), ("Chennai", "India"), ("Indore", "India"), ("Kolkata", "India"),
          ("London", "United Kingdom"), ("New York", "United States"), ("Berlin", "Germany"),
          ("Singapore", "Singapore"), ("Dubai", "United Arab Emirates"), ("Tokyo", "Japan")]
STATUSES = ["delivered"] * 6 + ["shipped"] * 2 + ["pending", "cancelled", "returned"]


def build(path: Path, force: bool = False, seed: int = 42) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if not force:
            return path
        path.unlink()

    rng = random.Random(seed)
    conn = sqlite3.connect(path)
    try:
        conn.executescript(SCHEMA)

        conn.executemany("INSERT INTO categories (id, name) VALUES (?, ?)", list(enumerate(CATEGORIES, 1)))

        products: list[tuple[int, float]] = []
        pid = 0
        for cat_id, cat in enumerate(CATEGORIES, 1):
            for name, price in PRODUCTS[cat]:
                pid += 1
                conn.execute(
                    "INSERT INTO products (id, name, category_id, price, stock) VALUES (?, ?, ?, ?, ?)",
                    (pid, name, cat_id, float(price), rng.randint(0, 250)),
                )
                products.append((pid, float(price)))

        start = dt.date(2024, 1, 1)
        end = dt.date(2026, 10, 31)
        span = (end - start).days
        customers = []
        for cid in range(1, 81):
            first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
            email = f"{first}.{last}{cid}@example.com".lower()
            city, country = rng.choice(CITIES)
            signup = start + dt.timedelta(days=rng.randint(0, span - 60))
            customers.append((cid, signup))
            conn.execute(
                "INSERT INTO customers (id, first_name, last_name, email, city, country, signup_date) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (cid, first, last, email, city, country, signup.isoformat()),
            )

        item_id = 0
        for oid in range(1, 601):
            cid, signup = rng.choice(customers)
            days_after = rng.randint(0, max(1, (end - signup).days))
            order_date = signup + dt.timedelta(days=days_after)
            conn.execute(
                "INSERT INTO orders (id, customer_id, order_date, status) VALUES (?, ?, ?, ?)",
                (oid, cid, order_date.isoformat(), rng.choice(STATUSES)),
            )
            for product_id, price in rng.sample(products, rng.randint(1, 4)):
                item_id += 1
                discount = rng.choice([1.0, 1.0, 1.0, 0.9, 0.85])
                conn.execute(
                    "INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
                    (item_id, oid, product_id, rng.randint(1, 3), round(price * discount, 2)),
                )
        conn.commit()
    finally:
        conn.close()
    return path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the sample SQLite database.")
    parser.add_argument("--path", type=Path, default=DEFAULT_SQLITE_PATH)
    parser.add_argument("--force", action="store_true", help="Overwrite if it already exists")
    args = parser.parse_args()
    print(f"Sample database ready at {build(args.path, force=args.force)}")
