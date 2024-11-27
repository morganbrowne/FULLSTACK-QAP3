const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require('bcrypt');
const { request } = require("http");
// const isMatch = await bcrypt.compare(inputPassword, storedHashedPassword);
// if (!isMatch) {}

const app = express();
const PORT = 3000;
const SALT_ROUNDS = 10;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
    session({
        secret: "replace_this_with_a_secure_key",
        resave: false,
        saveUninitialized: true,
    })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const USERS = [
    {
        id: 1,
        username: "AdminUser",
        email: "admin@example.com",
        password: bcrypt.hashSync("admin123", SALT_ROUNDS), //In a database, you'd just store the hashes, but for 
                                                            // our purposes we'll hash these existing users when the 
                                                            // app loads
        role: "admin",
    },
    {
        id: 2,
        username: "RegularUser",
        email: "user@example.com",
        password: bcrypt.hashSync("user123", SALT_ROUNDS),
        role: "user", // Regular user
    },
];

// USERS.push({
//     id: USERS.length + 1,
//     username, 
//     email,
//     password: hashedPassword,
//     role: "user"
// });

// Authentication Middleware... 

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect("/login");
}

const isAdmin = (req, res, next) => {
    if (req.session.user?.role === "admin") return next();
    res.redirect("/landing");
}

// Admin Route for adminLanding.ejs... 

app.get("/admin", isAuthenticated, isAdmin, (req, res) => {
    res.render("adminLanding", { users: USERS});
});

// GET /login - Render login form
app.get("/login", (request, response) => {
    response.render("login");
});

// POST /login - Allows a user to login
app.post("/login", (request, response) => {
    const { email, password } = request.body;
    const user = USERS.find(user => user.email === email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        request.session.user = user;
        return response.redirect("landing");
        //return response.render("login", {error: "Invalid email or pssword"});
    }
    response.render("login", {error: "Invalid email or password"});

    // request.session.user = {id: user.id, username: user.username, role: user.role };
    // response.redirect("/landing");

});

// GET /signup - Render signup form
app.get("/signup", (request, response) => {
    response.render("signup", {error: null});
});

// POST /signup - Allows a user to signup
app.post("/signup", async(request, response) => {
    const { username, email, password} = request.body;

    if (!username || !email || !password ) {
        return response.render("Signup", {error: "All feilds required to Sign Up"});
    }
    
    // added userExists for duplicate emails... 
    const userExists = USERS.find((u) => u.email === email);
    if (userExists) {
        return response.render("Signup", {error: "Email is already in use."});
    }

    try {
        //Hash passwords with bcrypt... 
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        USERS.push({ 
            id: USERS.length +1, 
            username, 
            email, 
            password: 
            hashedPassword, 
            role: "user" });

          // go to login page after signing up...
          response.redirect("/login");
    } catch (err) {
        console.error("Error hashing passowrd:", err);
        response.render("signup", {error: "Error occurred, please try again. "});
    }
});

// response.redirect("/login");

// GET / - Render index page or redirect to landing if logged in
app.get("/", (request, response) => {
    if (request.session.user) {
        return response.redirect("/landing");
    }
    response.render("index");
});

// GET /landing - Shows a welcome page for users, shows the names of all users if an admin
app.get("/landing", isAuthenticated, (request, response) => {
    if (request.session.user.role === "admin") {
        return response.redirect("/admin");
    } 
    response.render("landing", { user: request.session.user });
    
});

// GET /admin - page redirect for admin users... 
app.get("/admin", isAuthenticated, isAdmin, (req, res) => {
    res.render("admin", { users: USERS});
})

// Logout... 
app.get("/logout", (req, res) => {
    // Desroy the session... 
    req.session.destroy((err) => {
        if (err) {
            console.error("Error Ending Session:", err);
            return res.redirect("/landing"); // if error, go back to landing. 
        }
        res.redirect("/"); // To home page after succesfuly loging out. 
    });
});

console.log(USERS);
// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
