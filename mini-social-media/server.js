const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;


// =====================================================
// DATABASE CONNECTION
// =====================================================
const dataFolder = path.join(__dirname, "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const db = new sqlite3.Database(
    path.join(__dirname, "data", "social.db")
);


// =====================================================
// DATABASE HELPER FUNCTIONS
// =====================================================

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

            if (err) {
                reject(err);
            } else {
                resolve(row);
            }

        });

    });

}


function all(sql, params = []) {

    return new Promise((resolve, reject) => {

        db.all(sql, params, (err, rows) => {

            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }

        });

    });

}


// =====================================================
// CREATE DATABASE TABLES
// =====================================================

async function initDatabase() {

    // USERS TABLE

    await run(`
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            username TEXT UNIQUE NOT NULL,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            bio TEXT DEFAULT '',

            avatar TEXT DEFAULT
            'https://i.pravatar.cc/150',

            created_at
            DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);


    // POSTS TABLE

    await run(`
        CREATE TABLE IF NOT EXISTS posts (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            content TEXT NOT NULL,

            image TEXT DEFAULT '',

            created_at
            DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id)
            REFERENCES users(id)

        )
    `);


    // COMMENTS TABLE

    await run(`
        CREATE TABLE IF NOT EXISTS comments (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            post_id INTEGER NOT NULL,

            user_id INTEGER NOT NULL,

            content TEXT NOT NULL,

            created_at
            DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(post_id)
            REFERENCES posts(id),

            FOREIGN KEY(user_id)
            REFERENCES users(id)

        )
    `);


    // LIKES TABLE

    await run(`
        CREATE TABLE IF NOT EXISTS likes (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            post_id INTEGER NOT NULL,

            user_id INTEGER NOT NULL,

            UNIQUE(post_id, user_id),

            FOREIGN KEY(post_id)
            REFERENCES posts(id),

            FOREIGN KEY(user_id)
            REFERENCES users(id)

        )
    `);


    // FOLLOWERS TABLE

    await run(`
        CREATE TABLE IF NOT EXISTS followers (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            follower_id INTEGER NOT NULL,

            following_id INTEGER NOT NULL,

            UNIQUE(follower_id, following_id),

            FOREIGN KEY(follower_id)
            REFERENCES users(id),

            FOREIGN KEY(following_id)
            REFERENCES users(id)

        )
    `);


    // =================================================
    // INSERT SAMPLE USERS
    // =================================================

    const count = await get(
        "SELECT COUNT(*) AS count FROM users"
    );


    if (count.count === 0) {

        const password =
            await bcrypt.hash("123456", 10);


        const users = [

            [
                "Bipin Chaudhary",
                "bipin",
                "bipin@example.com",
                password,
                "B.Tech IT student | DSA & Web Development",
                "https://i.pravatar.cc/150?img=12"
            ],

            [
                "Avinash Kumar",
                "avinash",
                "avinash@example.com",
                password,
                "Developer and tech enthusiast",
                "https://i.pravatar.cc/150?img=13"
            ],

            [
                "Rahul Singh",
                "rahul",
                "rahul@example.com",
                password,
                "Learning JavaScript and Node.js",
                "https://i.pravatar.cc/150?img=14"
            ]

        ];


        for (const user of users) {

            await run(
                `
                INSERT INTO users
                (
                    name,
                    username,
                    email,
                    password,
                    bio,
                    avatar
                )
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                user
            );

        }


        // Get users

        const bipin =
            await get(
                "SELECT id FROM users WHERE username='bipin'"
            );

        const avinash =
            await get(
                "SELECT id FROM users WHERE username='avinash'"
            );

        const rahul =
            await get(
                "SELECT id FROM users WHERE username='rahul'"
            );


        // Sample posts

        await run(
            `
            INSERT INTO posts
            (
                user_id,
                content,
                image
            )
            VALUES (?, ?, ?)
            `,
            [
                bipin.id,
                "Just started building my mini social media platform! 🚀",
                ""
            ]
        );


        await run(
            `
            INSERT INTO posts
            (
                user_id,
                content,
                image
            )
            VALUES (?, ?, ?)
            `,
            [
                avinash.id,
                "Learning Express.js and SQLite today. #webdevelopment",
                ""
            ]
        );


        await run(
            `
            INSERT INTO posts
            (
                user_id,
                content,
                image
            )
            VALUES (?, ?, ?)
            `,
            [
                rahul.id,
                "Consistency is the key to improving at coding. 💻",
                ""
            ]
        );

    }

}


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


app.use(
    session({

        secret:
            "change-this-secret-in-production",

        resave: false,

        saveUninitialized: false,

        cookie: {
            maxAge:
                24 * 60 * 60 * 1000
        }

    })
);


app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// =====================================================
// LOGIN REQUIRED MIDDLEWARE
// =====================================================

function requireLogin(
    req,
    res,
    next
) {

    if (!req.session.user) {

        return res.status(401).json({

            message:
                "Please login first."

        });

    }

    next();

}


// =====================================================
// REGISTER
// =====================================================

app.post(
    "/api/register",
    async (req, res) => {

        try {

            const {
                name,
                username,
                email,
                password
            } = req.body;


            if (
                !name ||
                !username ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    message:
                        "All fields are required."

                });

            }


            if (password.length < 6) {

                return res.status(400).json({

                    message:
                        "Password must be at least 6 characters."

                });

            }


            const existing =
                await get(
                    `
                    SELECT id
                    FROM users
                    WHERE email=?
                    OR username=?
                    `,
                    [
                        email,
                        username
                    ]
                );


            if (existing) {

                return res.status(409).json({

                    message:
                        "Email or username already exists."

                });

            }


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            const result =
                await run(
                    `
                    INSERT INTO users
                    (
                        name,
                        username,
                        email,
                        password
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        name,
                        username,
                        email,
                        hashedPassword
                    ]
                );


            req.session.user = {

                id: result.id,

                name,

                username,

                email

            };


            res.json({

                message:
                    "Registration successful.",

                user:
                    req.session.user

            });


        } catch (error) {

            console.log(error);

            res.status(500).json({

                message:
                    "Registration failed."

            });

        }

    }
);


// =====================================================
// LOGIN
// =====================================================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                login,
                password
            } = req.body;


            const user =
                await get(
                    `
                    SELECT *
                    FROM users
                    WHERE email=?
                    OR username=?
                    `,
                    [
                        login,
                        login
                    ]
                );


            if (!user) {

                return res.status(401).json({

                    message:
                        "Invalid username/email or password."

                });

            }


            const validPassword =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!validPassword) {

                return res.status(401).json({

                    message:
                        "Invalid username/email or password."

                });

            }


            req.session.user = {

                id: user.id,

                name: user.name,

                username: user.username,

                email: user.email

            };


            res.json({

                message:
                    "Login successful.",

                user:
                    req.session.user

            });


        } catch (error) {

            res.status(500).json({

                message:
                    "Login failed."

            });

        }

    }
);


// =====================================================
// LOGOUT
// =====================================================

app.post(
    "/api/logout",
    (req, res) => {

        req.session.destroy(() => {

            res.json({

                message:
                    "Logged out."

            });

        });

    }
);


// =====================================================
// CURRENT USER
// =====================================================

app.get(
    "/api/me",
    (req, res) => {

        res.json({

            user:
                req.session.user ||
                null

        });

    }
);


// =====================================================
// GET ALL USERS
// =====================================================

app.get(
    "/api/users",
    async (req, res) => {

        try {

            const users =
                await all(
                    `
                    SELECT

                        u.id,

                        u.name,

                        u.username,

                        u.bio,

                        u.avatar,

                        (
                            SELECT COUNT(*)
                            FROM followers f
                            WHERE f.following_id=u.id
                        ) AS followers,

                        (
                            SELECT COUNT(*)
                            FROM followers f
                            WHERE f.follower_id=u.id
                        ) AS following

                    FROM users u

                    ORDER BY u.id DESC
                    `
                );


            res.json(users);


        } catch (error) {

            res.status(500).json({

                message:
                    "Could not load users."

            });

        }

    }
);


// =====================================================
// GET USER PROFILE
// =====================================================

app.get(
    "/api/users/:username",
    async (req, res) => {

        try {

            const user =
                await get(
                    `
                    SELECT

                        u.id,

                        u.name,

                        u.username,

                        u.bio,

                        u.avatar,

                        (
                            SELECT COUNT(*)
                            FROM followers f
                            WHERE f.following_id=u.id
                        ) AS followers,

                        (
                            SELECT COUNT(*)
                            FROM followers f
                            WHERE f.follower_id=u.id
                        ) AS following

                    FROM users u

                    WHERE u.username=?
                    `,
                    [
                        req.params.username
                    ]
                );


            if (!user) {

                return res.status(404).json({

                    message:
                        "User not found."

                });

            }


            let isFollowing = false;


            if (req.session.user) {

                const row =
                    await get(
                        `
                        SELECT id
                        FROM followers

                        WHERE follower_id=?
                        AND following_id=?
                        `,
                        [
                            req.session.user.id,
                            user.id
                        ]
                    );


                isFollowing =
                    !!row;

            }


            res.json({

                ...user,

                isFollowing

            });


        } catch (error) {

            res.status(500).json({

                message:
                    "Could not load profile."

            });

        }

    }
);


// =====================================================
// UPDATE PROFILE
// =====================================================

app.put(
    "/api/profile",
    requireLogin,
    async (req, res) => {

        try {

            const {
                name,
                bio,
                avatar
            } = req.body;


            await run(
                `
                UPDATE users

                SET
                    name=?,
                    bio=?,
                    avatar=?

                WHERE id=?
                `,
                [
                    name || "",
                    bio || "",
                    avatar ||
                        "https://i.pravatar.cc/150",

                    req.session.user.id
                ]
            );


            req.session.user.name =
                name;


            res.json({

                message:
                    "Profile updated."

            });


        } catch (error) {

            res.status(500).json({

                message:
                    "Profile update failed."

            });

        }

    }
);


// =====================================================
// GET ALL POSTS
// =====================================================

app.get(
    "/api/posts",
    async (req, res) => {

        try {

            const posts =
                await all(
                    `
                    SELECT

                        p.id,

                        p.content,

                        p.image,

                        p.created_at,

                        u.id AS user_id,

                        u.name,

                        u.username,

                        u.avatar,

                        (
                            SELECT COUNT(*)
                            FROM likes l
                            WHERE l.post_id=p.id
                        ) AS likes,

                        (
                            SELECT COUNT(*)
                            FROM comments c
                            WHERE c.post_id=p.id
                        ) AS comments,

                        CASE

                            WHEN EXISTS (

                                SELECT 1

                                FROM likes l2

                                WHERE
                                    l2.post_id=p.id

                                AND
                                    l2.user_id=?

                            )

                            THEN 1

                            ELSE 0

                        END AS liked

                    FROM posts p

                    JOIN users u
                    ON p.user_id=u.id

                    ORDER BY
                        p.created_at DESC,
                        p.id DESC
                    `,
                    [
                        req.session.user
                            ? req.session.user.id
                            : 0
                    ]
                );


            res.json(posts);


        } catch (error) {

            res.status(500).json({

                message:
                    "Could not load posts."

            });

        }

    }
);


// =====================================================
// CREATE POST
// =====================================================

app.post(
    "/api/posts",
    requireLogin,
    async (req, res) => {

        try {

            const {
                content,
                image
            } = req.body;


            if (
                !content ||
                !content.trim()
            ) {

                return res.status(400).json({

                    message:
                        "Post cannot be empty."

                });

            }


            const result =
                await run(
                    `
                    INSERT INTO posts
                    (
                        user_id,
                        content,
                        image
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        req.session.user.id,
                        content.trim(),
                        image || ""
                    ]
                );


            res.json({

                message:
                    "Post created.",

                postId:
                    result.id

            });


        } catch (error) {

            res.status(500).json({

                message:
                    "Could not create post."

            });

        }

    }
);


// =====================================================
// DELETE POST
// =====================================================

app.delete(
    "/api/posts/:id",
    requireLogin,
    async (req, res) => {

        try {

            const post =
                await get(
                    `
                    SELECT user_id
                    FROM posts
                    WHERE id=?
                    `,
                    [
                        req.params.id
                    ]
                );


            if (!post) {

                return res.status(404).json({

                    message:
                        "Post not found."

                });

            }


            if (
                post.user_id !==
                req.session.user.id
            ) {

                return res.status(403).json({

                    message:
                        "You can delete only your own posts."

                });

            }


            await run(
                "DELETE FROM likes WHERE post_id=?",
                [
                    req.params.id
                ]
            );


            await run(
                "DELETE FROM comments WHERE post_id=?",
                [
                    req.params.id
                ]
            );


            await run(
                "DELETE FROM posts WHERE id=?",
                [
                    req.params.id
                ]
            );


            res.json({

                message:
                    "Post deleted."

            });


        } catch (error) {

            res.status(500).json({

                message:
                    "Could not delete post."

            });

        }

    }
);


// =====================================================
// LIKE / UNLIKE POST
// =====================================================

app.post(
    "/api/posts/:id/like",
    requireLogin,
    async (req, res) => {

        try {

            const existing =
                await get(
                    `
                    SELECT id

                    FROM likes

                    WHERE
                        post_id=?

                    AND
                        user_id=?
                    `,
                    [
                        req.params.id,
                        req.session.user.id
                    ]
                );


            if (existing) {

                await run(
                    `
                    DELETE FROM likes
                    WHERE id=?
                    `,
                    [
                        existing.id
                    ]
                );

            } else {

                await run(
                    `
                    INSERT INTO likes
                    (
                        post_id,
                        user_id
                    )
                    VALUES (?, ?)
                    `,
                    [
                        req.params.id,
                        req.session.user.id
                    ]
                );

            }


            const result =
                await get(
                    `
                    SELECT COUNT(*) AS count

                    FROM likes

                    WHERE post_id=?
                    `,
                    [
                        req.params.id
                    ]
                );


            res.json({

                liked:
                    !existing,

                likes:
                    result.count

            });


        } catch (error) {

            res.status(500).json({

                message:
                    "Like action failed."

            });

        }

    }
);


// =====================================================
// GET COMMENTS
// =====================================================

app.get(
    "/api/posts/:id/comments",
    async (req, res) => {

        try {

            const comments =
                await all(
                    `
                    SELECT

                        c.id,

                        c.content,

                        c.created_at,

                        u.name,

                        u.username,

                        u.avatar

                    FROM comments c

                    JOIN users u
                    ON c.user_id=u.id

                    WHERE c.post_id=?

                    ORDER BY
                        c.created_at ASC,
                        c.id ASC
                    `,
                    [
                        req.params.id
                    ]
                );


            res.json(comments);


        } catch (error) {

            res.status(500).json({

                message:
                    "Could not load comments."

            });

        }

    }
);


// =====================================================
// ADD COMMENT
// =====================================================

app.post(
    "/api/posts/:id/comments",
    requireLogin,
    async (req, res) => {

        try {

            const {
                content
            } = req.body;


            if (
                !content ||
                !content.trim()
            ) {

                return res.status(400).json({

                    message:
                        "Comment cannot be empty."

                });

            }


            await run(
                `
                INSERT INTO comments
                (
                    post_id,
                    user_id,
                    content
                )
                VALUES (?, ?, ?)
                `,
                [
                    req.params.id,
                    req.session.user.id,
                    content.trim()
                ]
            );


            res.json({

                message:
                    "Comment added."

            });


        } catch (error) {

            res.status(500).json({

                message:
                    "Could not add comment."

            });

        }

    }
);


// =====================================================
// FOLLOW / UNFOLLOW USER
// =====================================================

app.post(
    "/api/users/:id/follow",
    requireLogin,
    async (req, res) => {

        try {

            const targetId =
                Number(req.params.id);


            if (
                targetId ===
                req.session.user.id
            ) {

                return res.status(400).json({

                    message:
                        "You cannot follow yourself."

                });

            }


            const target =
                await get(
                    `
                    SELECT id
                    FROM users
                    WHERE id=?
                    `,
                    [
                        targetId
                    ]
                );


            if (!target) {

                return res.status(404).json({

                    message:
                        "User not found."

                });

            }


            const existing =
                await get(
                    `
                    SELECT id

                    FROM followers

                    WHERE
                        follower_id=?

                    AND
                        following_id=?
                    `,
                    [
                        req.session.user.id,
                        targetId
                    ]
                );


            if (existing) {

                await run(
                    `
                    DELETE FROM followers
                    WHERE id=?
                    `,
                    [
                        existing.id
                    ]
                );

            } else {

                await run(
                    `
                    INSERT INTO followers
                    (
                        follower_id,
                        following_id
                    )
                    VALUES (?, ?)
                    `,
                    [
                        req.session.user.id,
                        targetId
                    ]
                );

            }


            const result =
                await get(
                    `
                    SELECT COUNT(*) AS count

                    FROM followers

                    WHERE following_id=?
                    `,
                    [
                        targetId
                    ]
                );


            res.json({

                following:
                    !existing,

                followers:
                    result.count

            });


        } catch (error) {

            res.status(500).json({

                message:
                    "Follow action failed."

            });

        }

    }
);


// =====================================================
// START SERVER
// =====================================================

initDatabase()
    .then(() => {

        app.listen(
            PORT,
            () => {

                console.log(
                    `Social app running at http://localhost:${PORT}`
                );

            }
        );

    })
    .catch(error => {

        console.error(
            "Database error:",
            error
        );

    });