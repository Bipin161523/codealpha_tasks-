let products = [];

let cart =
    JSON.parse(
        localStorage.getItem("cart")
    ) || [];

let currentUser = null;


// ================= API FUNCTION =================

async function api(url, options = {}) {

    const response = await fetch(url, {

        headers: {
            "Content-Type": "application/json"
        },

        ...options

    });

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            data.message ||
            "Something went wrong"
        );

    }

    return data;
}


// ================= LOAD PRODUCTS =================

async function loadProducts() {

    products =
        await api("/api/products");

    const grid =
        document.getElementById(
            "productGrid"
        );

    grid.innerHTML =
        products.map(product => `

            <div class="card">

                <img
                    src="${product.image}"
                    alt="${product.name}"
                >

                <div class="card-content">

                    <h3>
                        ${product.name}
                    </h3>

                    <p>
                        ${product.description}
                    </p>

                    <div class="price">

                        ₹${product.price.toLocaleString("en-IN")}

                    </div>

                    <div class="card-actions">

                        <button
                            class="details"
                            onclick="viewDetails(${product.id})">

                            Details

                        </button>

                        <button
                            class="add"
                            onclick="addToCart(${product.id})">

                            Add to Cart

                        </button>

                    </div>

                </div>

            </div>

        `).join("");

}


// ================= ADD TO CART =================

function addToCart(id) {

    const item =
        cart.find(
            item =>
                item.productId === id
        );

    if (item) {

        item.quantity++;

    } else {

        cart.push({

            productId: id,

            quantity: 1

        });

    }

    saveCart();

    showToast(
        "Product added to cart"
    );

}


// ================= SAVE CART =================

function saveCart() {

    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );

    renderCart();

}


// ================= DISPLAY CART =================

function renderCart() {

    const box =
        document.getElementById(
            "cartItems"
        );

    if (cart.length === 0) {

        box.innerHTML =
            "<p>Your cart is empty.</p>";

        document.getElementById(
            "cartTotal"
        ).textContent = "0";

        document.getElementById(
            "cartCount"
        ).textContent = "0";

        return;
    }


    let total = 0;

    let count = 0;


    box.innerHTML =
        cart.map(item => {

            const product =
                products.find(
                    p =>
                        p.id ===
                        item.productId
                );

            if (!product) return "";


            total +=
                product.price *
                item.quantity;

            count +=
                item.quantity;


            return `

                <div class="cart-item">

                    <div>

                        <strong>
                            ${product.name}
                        </strong>

                        <br>

                        ₹${product.price}
                        ×
                        ${item.quantity}

                    </div>


                    <div class="qty">

                        <button
                            onclick="changeQty(
                                ${product.id},
                                -1
                            )">

                            −

                        </button>


                        ${item.quantity}


                        <button
                            onclick="changeQty(
                                ${product.id},
                                1
                            )">

                            +

                        </button>


                        <button
                            onclick="removeFromCart(
                                ${product.id}
                            )">

                            Remove

                        </button>

                    </div>

                </div>

            `;

        }).join("");


    document.getElementById(
        "cartTotal"
    ).textContent =
        total.toLocaleString("en-IN");


    document.getElementById(
        "cartCount"
    ).textContent =
        count;

}


// ================= CHANGE QUANTITY =================

function changeQty(id, amount) {

    const item =
        cart.find(
            x =>
                x.productId === id
        );

    if (!item) return;

    item.quantity += amount;


    if (item.quantity <= 0) {

        cart =
            cart.filter(
                x =>
                    x.productId !== id
            );

    }

    saveCart();

}


// ================= REMOVE CART ITEM =================

function removeFromCart(id) {

    cart =
        cart.filter(
            item =>
                item.productId !== id
        );

    saveCart();

}


// ================= PRODUCT DETAILS =================

function viewDetails(id) {

    const product =
        products.find(
            p =>
                p.id === id
        );

    if (!product) return;


    alert(

        product.name +

        "\n\n" +

        product.description +

        "\n\nPrice: ₹" +

        product.price +

        "\nStock: " +

        product.stock

    );

}


// ================= OPEN LOGIN =================

function openAuth() {

    document.getElementById(
        "authModal"
    ).classList.remove(
        "hidden"
    );

}


// ================= CLOSE LOGIN =================

function closeAuth() {

    document.getElementById(
        "authModal"
    ).classList.add(
        "hidden"
    );

}


// ================= SHOW LOGIN =================

function showLogin() {

    document.getElementById(
        "loginForm"
    ).classList.remove(
        "hidden"
    );

    document.getElementById(
        "registerForm"
    ).classList.add(
        "hidden"
    );


    document.getElementById(
        "loginTab"
    ).classList.add(
        "active"
    );

    document.getElementById(
        "registerTab"
    ).classList.remove(
        "active"
    );

}


// ================= SHOW REGISTER =================

function showRegister() {

    document.getElementById(
        "loginForm"
    ).classList.add(
        "hidden"
    );

    document.getElementById(
        "registerForm"
    ).classList.remove(
        "hidden"
    );


    document.getElementById(
        "loginTab"
    ).classList.remove(
        "active"
    );

    document.getElementById(
        "registerTab"
    ).classList.add(
        "active"
    );

}


// ================= LOGIN =================

document.getElementById(
    "loginForm"
).addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        try {

            const data =
                await api(
                    "/api/login",
                    {

                        method: "POST",

                        body:
                            JSON.stringify({

                                email:
                                    document.getElementById(
                                        "loginEmail"
                                    ).value,

                                password:
                                    document.getElementById(
                                        "loginPassword"
                                    ).value

                            })

                    }
                );


            currentUser =
                data.user;


            closeAuth();

            updateAuthUI();

            loadOrders();

            showToast(
                "Login successful"
            );


        } catch(error) {

            document.getElementById(
                "authMessage"
            ).textContent =
                error.message;

        }

    }
);


// ================= REGISTER =================

document.getElementById(
    "registerForm"
).addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        try {

            const data =
                await api(
                    "/api/register",
                    {

                        method: "POST",

                        body:
                            JSON.stringify({

                                name:
                                    document.getElementById(
                                        "registerName"
                                    ).value,

                                email:
                                    document.getElementById(
                                        "registerEmail"
                                    ).value,

                                password:
                                    document.getElementById(
                                        "registerPassword"
                                    ).value

                            })

                    }
                );


            currentUser =
                data.user;


            closeAuth();

            updateAuthUI();

            loadOrders();

            showToast(
                "Account created successfully"
            );


        } catch(error) {

            document.getElementById(
                "authMessage"
            ).textContent =
                error.message;

        }

    }
);


// ================= UPDATE LOGIN BUTTON =================

function updateAuthUI() {

    const button =
        document.getElementById(
            "authBtn"
        );


    if (!currentUser) {

        button.textContent =
            "Login";

        button.onclick =
            openAuth;

        document.getElementById(
            "orders"
        ).classList.add(
            "hidden"
        );

        return;
    }


    button.textContent =
        "Logout (" +
        currentUser.name +
        ")";


    button.onclick =
        logout;


    document.getElementById(
        "orders"
    ).classList.remove(
        "hidden"
    );

}


// ================= LOGOUT =================

async function logout() {

    await api(
        "/api/logout",
        {
            method: "POST"
        }
    );

    currentUser = null;

    updateAuthUI();

    showToast(
        "Logged out"
    );

}


// ================= CHECKOUT =================

async function checkout() {

    if (cart.length === 0) {

        showToast(
            "Your cart is empty"
        );

        return;
    }


    if (!currentUser) {

        openAuth();

        return;
    }


    try {

        const data =
            await api(
                "/api/orders",
                {

                    method: "POST",

                    body:
                        JSON.stringify({
                            items: cart
                        })

                }
            );


        cart = [];

        saveCart();

        await loadProducts();

        await loadOrders();


        showToast(
            "Order #" +
            data.orderId +
            " placed successfully"
        );


        document.getElementById(
            "orders"
        ).scrollIntoView();


    } catch(error) {

        showToast(
            error.message
        );

    }

}


// ================= LOAD ORDERS =================

async function loadOrders() {

    if (!currentUser) return;


    try {

        const orders =
            await api(
                "/api/orders"
            );


        const list =
            document.getElementById(
                "orderList"
            );


        if (orders.length === 0) {

            list.innerHTML =
                "<p>No orders yet.</p>";

            return;

        }


        list.innerHTML =
            orders.map(
                order => `

                <div class="order">

                    <strong>
                        Order #${order.id}
                    </strong>

                    <p>
                        Total:
                        ₹${order.total.toLocaleString("en-IN")}
                    </p>

                    <p>
                        Status:
                        ${order.status}
                    </p>

                    <small>
                        ${order.created_at}
                    </small>

                </div>

            `
            ).join("");


    } catch(error) {

        console.log(error);

    }

}


// ================= TOAST =================

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.style.display =
        "block";


    setTimeout(
        () => {

            toast.style.display =
                "none";

        },
        2500
    );

}


// ================= INITIALIZE =================

async function initialize() {

    try {

        const data =
            await api(
                "/api/me"
            );

        currentUser =
            data.user;


        updateAuthUI();

        await loadProducts();

        renderCart();


        if (currentUser) {

            await loadOrders();

        }

    } catch(error) {

        console.log(error);

    }

}


initialize();