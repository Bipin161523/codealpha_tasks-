let currentUser = null;


// =====================================================
// SHORTCUT
// =====================================================

const $ = id =>
    document.getElementById(id);


// =====================================================
// API FUNCTION
// =====================================================

async function api(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {

                headers: {

                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})

                },

                ...options

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Request failed."
        );

    }


    return data;

}


// =====================================================
// INITIALIZE APP
// =====================================================

async function init() {

    try {

        const me =
            await api(
                "/api/me"
            );


        currentUser =
            me.user;


        updateAuthUI();


        await loadPosts();


        await loadUsers();


    } catch (error) {

        console.error(
            error
        );

    }

}


// =====================================================
// UPDATE AUTH UI
// =====================================================

function updateAuthUI() {

    const button =
        $("authBtn");


    if (currentUser) {

        button.textContent =
            `Logout (${currentUser.username})`;


        button.onclick =
            logout;


        $("composer")
            .classList
            .remove(
                "hidden"
            );

    } else {

        button.textContent =
            "Login";


        button.onclick =
            openAuth;


        $("composer")
            .classList
            .add(
                "hidden"
            );

    }

}


// =====================================================
// LOAD POSTS
// =====================================================

async function loadPosts() {

    const posts =
        await api(
            "/api/posts"
        );


    $("postList")
        .innerHTML =

        posts.map(
            post => `

            <article class="post">


                <div class="post-header">


                    <img
                        class="avatar"
                        src="${post.avatar}"
                        alt="avatar"
                    >


                    <div>

                        <div class="user-name">

                            ${escapeHtml(
                                post.name
                            )}

                        </div>


                        <div class="username">

                            @${escapeHtml(
                                post.username
                            )}

                        </div>

                    </div>


                    ${
                        currentUser &&
                        currentUser.id ===
                        post.user_id

                        ?

                        `
                        <button
                            class="delete-btn"
                            onclick="
                                deletePost(
                                    ${post.id}
                                )
                            "
                        >
                            Delete
                        </button>
                        `

                        :

                        ""

                    }


                </div>


                <div class="post-content">

                    ${escapeHtml(
                        post.content
                    )}

                </div>


                ${
                    post.image

                    ?

                    `
                    <img
                        class="post-image"
                        src="${escapeHtml(
                            post.image
                        )}"
                        alt="post image"
                    >
                    `

                    :

                    ""

                }


                <div class="post-actions">


                    <button
                        class="
                            like-btn
                            ${
                                post.liked
                                    ? "liked"
                                    : ""
                            }
                        "

                        onclick="
                            toggleLike(
                                ${post.id}
                            )
                        "
                    >

                        ${
                            post.liked
                                ? "♥"
                                : "♡"
                        }

                        ${post.likes}

                        Likes

                    </button>


                    <span>

                        💬

                        ${post.comments}

                        Comments

                    </span>


                </div>


                <div class="comment-box">


                    <input
                        id="comment-${post.id}"
                        placeholder="
                            Write a comment...
                        "
                    >


                    <button
                        onclick="
                            addComment(
                                ${post.id}
                            )
                        "
                    >

                        Comment

                    </button>


                </div>


                <div
                    id="comments-${post.id}"
                    class="comments"
                >

                </div>


            </article>

        `
        ).join("");


    // Load comments

    for (
        const post of posts
    ) {

        loadComments(
            post.id
        );

    }

}


// =====================================================
// LOAD COMMENTS
// =====================================================

async function loadComments(
    postId
) {

    const comments =
        await api(
            `/api/posts/${postId}/comments`
        );


    const box =
        $(
            `comments-${postId}`
        );


    box.innerHTML =

        comments.map(
            comment => `

            <div class="comment">

                <strong>

                    @${escapeHtml(
                        comment.username
                    )}

                </strong>

                ${escapeHtml(
                    comment.content
                )}

            </div>

        `
        ).join("");

}


// =====================================================
// CREATE POST
// =====================================================

async function createPost() {

    if (!currentUser) {

        openAuth();

        return;

    }


    const content =
        $("postContent")
            .value
            .trim();


    const image =
        $("postImage")
            .value
            .trim();


    if (!content) {

        showToast(
            "Write something first."
        );

        return;

    }


    try {

        await api(
            "/api/posts",
            {

                method:
                    "POST",

                body:
                    JSON.stringify({

                        content,

                        image

                    })

            }
        );


        $("postContent")
            .value = "";


        $("postImage")
            .value = "";


        await loadPosts();


        showToast(
            "Post published."
        );


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// =====================================================
// LIKE / UNLIKE
// =====================================================

async function toggleLike(
    postId
) {

    if (!currentUser) {

        openAuth();

        return;

    }


    try {

        await api(
            `/api/posts/${postId}/like`,
            {

                method:
                    "POST"

            }
        );


        await loadPosts();


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// =====================================================
// ADD COMMENT
// =====================================================

async function addComment(
    postId
) {

    if (!currentUser) {

        openAuth();

        return;

    }


    const input =
        $(
            `comment-${postId}`
        );


    const content =
        input.value.trim();


    if (!content) {

        return;

    }


    try {

        await api(
            `/api/posts/${postId}/comments`,
            {

                method:
                    "POST",

                body:
                    JSON.stringify({

                        content

                    })

            }
        );


        input.value = "";


        await loadPosts();


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// =====================================================
// DELETE POST
// =====================================================

async function deletePost(
    postId
) {

    if (
        !confirm(
            "Delete this post?"
        )
    ) {

        return;

    }


    try {

        await api(
            `/api/posts/${postId}`,
            {

                method:
                    "DELETE"

            }
        );


        await loadPosts();


        showToast(
            "Post deleted."
        );


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// =====================================================
// LOAD USERS
// =====================================================

async function loadUsers() {

    const users =
        await api(
            "/api/users"
        );


    $("userList")
        .innerHTML =

        users.map(
            user => `

            <div class="person">


                <img
                    class="avatar"
                    src="${user.avatar}"
                    alt="avatar"
                >


                <div class="person-info">


                    <strong>

                        ${escapeHtml(
                            user.name
                        )}

                    </strong>


                    <span class="username">

                        @${escapeHtml(
                            user.username
                        )}

                    </span>


                    <small>

                        ${user.followers}

                        followers

                    </small>


                </div>


                ${
                    currentUser &&
                    currentUser.id !==
                    user.id

                    ?

                    `
                    <button
                        class="follow-btn"
                        onclick="
                            toggleFollow(
                                ${user.id}
                            )
                        "
                    >

                        Follow

                    </button>
                    `

                    :

                    ""

                }


            </div>

        `
        ).join("");

}


// =====================================================
// FOLLOW / UNFOLLOW
// =====================================================

async function toggleFollow(
    userId
) {

    if (!currentUser) {

        openAuth();

        return;

    }


    try {

        await api(
            `/api/users/${userId}/follow`,
            {

                method:
                    "POST"

            }
        );


        await loadUsers();


        showToast(
            "Follow status updated."
        );


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// =====================================================
// AUTH MODAL
// =====================================================

function openAuth() {

    $("authModal")
        .classList
        .remove(
            "hidden"
        );

}


function closeAuth() {

    $("authModal")
        .classList
        .add(
            "hidden"
        );

}


// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {

    $("loginForm")
        .classList
        .remove(
            "hidden"
        );


    $("registerForm")
        .classList
        .add(
            "hidden"
        );


    $("loginTab")
        .classList
        .add(
            "active"
        );


    $("registerTab")
        .classList
        .remove(
            "active"
        );

}


// =====================================================
// SHOW REGISTER
// =====================================================

function showRegister() {

    $("loginForm")
        .classList
        .add(
            "hidden"
        );


    $("registerForm")
        .classList
        .remove(
            "hidden"
        );


    $("loginTab")
        .classList
        .remove(
            "active"
        );


    $("registerTab")
        .classList
        .add(
            "active"
        );

}


// =====================================================
// LOGIN
// =====================================================

$("loginForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                const data =
                    await api(
                        "/api/login",
                        {

                            method:
                                "POST",

                            body:
                                JSON.stringify({

                                    login:
                                        $(
                                            "loginValue"
                                        ).value,

                                    password:
                                        $(
                                            "loginPassword"
                                        ).value

                                })

                        }
                    );


                currentUser =
                    data.user;


                closeAuth();


                updateAuthUI();


                await loadPosts();


                await loadUsers();


                showToast(
                    "Login successful."
                );


            } catch (error) {

                $("authMessage")
                    .textContent =
                    error.message;

            }

        }
    );


// =====================================================
// REGISTER
// =====================================================

$("registerForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                const data =
                    await api(
                        "/api/register",
                        {

                            method:
                                "POST",

                            body:
                                JSON.stringify({

                                    name:
                                        $(
                                            "registerName"
                                        ).value,

                                    username:
                                        $(
                                            "registerUsername"
                                        ).value,

                                    email:
                                        $(
                                            "registerEmail"
                                        ).value,

                                    password:
                                        $(
                                            "registerPassword"
                                        ).value

                                })

                        }
                    );


                currentUser =
                    data.user;


                closeAuth();


                updateAuthUI();


                await loadPosts();


                await loadUsers();


                showToast(
                    "Account created."
                );


            } catch (error) {

                $("authMessage")
                    .textContent =
                    error.message;

            }

        }
    );


// =====================================================
// LOGOUT
// =====================================================

async function logout() {

    await api(
        "/api/logout",
        {
            method:
                "POST"
        }
    );


    currentUser =
        null;


    updateAuthUI();


    await loadPosts();


    await loadUsers();


    showToast(
        "Logged out."
    );

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(
    value
) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// =====================================================
// TOAST
// =====================================================

function showToast(
    message
) {

    $("toast")
        .textContent =
        message;


    $("toast")
        .style
        .display =
        "block";


    setTimeout(
        () => {

            $("toast")
                .style
                .display =
                "none";

        },
        2200
    );

}


// =====================================================
// START
// =====================================================

init();