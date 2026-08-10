const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

// ================= DATABASE =================

const db = new sqlite3.Database(
    path.join(__dirname, "data", "shop.db")
);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    changes: this.changes
                });
            }
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// ================= CREATE DATABASE =================

async function initDatabase() {

    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price REAL NOT NULL,
            image TEXT NOT NULL,
            stock INTEGER DEFAULT 10
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'Placed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    `);

    // Add sample products only if database is empty

    const result = await get(
        "SELECT COUNT(*) AS count FROM products"
    );

    if (result.count === 0) {

        const products = [

            [
                "Wireless Headphones",
                "High quality wireless headphones with clear sound.",
                1499,
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
                20
            ],

            [
                "Smart Watch",
                "Modern smart watch with fitness tracking.",
                2499,
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
                15
            ],

            [
                "Running Shoes",
                "Comfortable and lightweight running shoes.",
                1999,
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
                25
            ],

            [
                "Backpack",
                "Durable backpack for college and travel.",
                999,
                "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
                30
            ],

            [
                "Mechanical Keyboard",
                "RGB mechanical keyboard for gaming and coding.",
                2999,
                "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
                12
            ],

            [
                "Sunglasses",
                "Stylish sunglasses with UV protection.",
                799,
                "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800",
                18
            ]

        ];

        for (const product of products) {

            await run(
                `
                INSERT INTO products
                (name, description, price, image, stock)
                VALUES (?, ?, ?, ?, ?)
                `,
                product
            );

        }
    }
}

// ================= MIDDLEWARE =================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    session({
        secret: "my-ecommerce-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

app.use(express.static(path.join(__dirname, "public")));

// ================= LOGIN CHECK =================

function requireLogin(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({
            message: "Please login first"
        });

    }

    next();
}

// ================= PRODUCTS =================

// Get all products

app.get("/api/products", async (req, res) => {

    try {

        const products = await all(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json(products);

    } catch (error) {

        res.status(500).json({
            message: "Unable to load products"
        });

    }

});

// Get single product

app.get("/api/products/:id", async (req, res) => {

    try {

        const product = await get(
            "SELECT * FROM products WHERE id = ?",
            [req.params.id]
        );

        if (!product) {

            return res.status(404).json({
                message: "Product not found"
            });

        }

        res.json(product);

    } catch (error) {

        res.status(500).json({
            message: "Unable to load product"
        });

    }

});

// ================= REGISTER =================

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {

            return res.status(400).json({
                message: "All fields are required"
            });

        }

        if (password.length < 6) {

            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });

        }

        const existingUser = await get(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUser) {

            return res.status(400).json({
                message: "Email already registered"
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const result = await run(
            `
            INSERT INTO users
            (name, email, password)
            VALUES (?, ?, ?)
            `,
            [
                name,
                email,
                hashedPassword
            ]
        );

        req.session.user = {
            id: result.id,
            name: name,
            email: email
        };

        res.json({
            message: "Registration successful",
            user: req.session.user
        });

    } catch (error) {

        res.status(500).json({
            message: "Registration failed"
        });

    }

});

// ================= LOGIN =================

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        const user = await get(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (!user) {

            return res.status(401).json({
                message: "Invalid email or password"
            });

        }

        const validPassword =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!validPassword) {

            return res.status(401).json({
                message: "Invalid email or password"
            });

        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email
        };

        res.json({
            message: "Login successful",
            user: req.session.user
        });

    } catch (error) {

        res.status(500).json({
            message: "Login failed"
        });

    }

});

// ================= LOGOUT =================

app.post("/api/logout", (req, res) => {

    req.session.destroy(() => {

        res.json({
            message: "Logged out successfully"
        });

    });

});

// ================= CURRENT USER =================

app.get("/api/me", (req, res) => {

    res.json({
        user: req.session.user || null
    });

});

// ================= CREATE ORDER =================

app.post("/api/orders", requireLogin, async (req, res) => {

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {

        return res.status(400).json({
            message: "Cart is empty"
        });

    }

    try {

        let total = 0;

        const checkedItems = [];

        // Check products and stock

        for (const item of items) {

            const product = await get(
                "SELECT * FROM products WHERE id = ?",
                [item.productId]
            );

            const quantity =
                Number(item.quantity);

            if (!product) {

                return res.status(400).json({
                    message: "Product not found"
                });

            }

            if (quantity <= 0) {

                return res.status(400).json({
                    message: "Invalid quantity"
                });

            }

            if (quantity > product.stock) {

                return res.status(400).json({
                    message:
                        `${product.name} has only ${product.stock} items available`
                });

            }

            total +=
                product.price * quantity;

            checkedItems.push({
                product,
                quantity
            });

        }

        // Create order

        const order = await run(
            `
            INSERT INTO orders
            (user_id, total, status)
            VALUES (?, ?, ?)
            `,
            [
                req.session.user.id,
                total,
                "Placed"
            ]
        );

        // Save order items

        for (const item of checkedItems) {

            await run(
                `
                INSERT INTO order_items
                (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
                `,
                [
                    order.id,
                    item.product.id,
                    item.quantity,
                    item.product.price
                ]
            );

            // Reduce stock

            await run(
                `
                UPDATE products
                SET stock = stock - ?
                WHERE id = ?
                `,
                [
                    item.quantity,
                    item.product.id
                ]
            );

        }

        res.json({
            message: "Order placed successfully",
            orderId: order.id,
            total: total
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Order processing failed"
        });

    }

});

// ================= GET ORDERS =================

app.get(
    "/api/orders",
    requireLogin,
    async (req, res) => {

        try {

            const orders = await all(
                `
                SELECT *
                FROM orders
                WHERE user_id = ?
                ORDER BY created_at DESC
                `,
                [req.session.user.id]
            );

            res.json(orders);

        } catch (error) {

            res.status(500).json({
                message: "Unable to load orders"
            });

        }

    }
);

// ================= START SERVER =================

initDatabase()
    .then(() => {

        app.listen(PORT, () => {

            console.log(
                `Server running at http://localhost:${PORT}`
            );

        });

    })
    .catch(error => {

        console.log(
            "Database error:",
            error
        );

    });