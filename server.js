//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Imports
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');


//const initializeDB = require('./populatedb');
const dbFileName = 'blogData.db';
//let db;

// Load environment variables from .env file
dotenv.config();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

// Use environment variables for client ID and secret
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/auth/google/callback`;
const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HandleBars
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: (str) => str.toLowerCase(),
            ifCond: (v1, v2, options) => (v1 === v2 ? options.fn(this) : options.inverse(this)),
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);

app.use((req, res, next) => {
    res.locals.appName = 'Travel Blog';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    next();
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });
    console.log('Connected to the database.');
    return db;
}

// Configure passport
passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: REDIRECT_URI,
}, (token, tokenSecret, profile, done) => done(null, profile)));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.get('/', async (req, res) => {
    try{
        const db = await initializeDB();        
        const posts = await db.all('SELECT * FROM posts');
        console.log(posts);
        
        res.render('home', { posts: posts});
    } catch(err){
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/loginRegister', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

app.get('/error', (req, res) => {
    res.render('error');
});

app.get('/post/:id', (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (post) {
        res.render('post', { post });
    } else {
        res.redirect('/');
    }
});

app.post('/posts', (req, res) => {
    const { title, content } = req.body;
    addPost(title, content, getCurrentUser(req));
    res.redirect('/');
});

app.post('/like/:id', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.likes += 1;
    }
    res.redirect('/');
});

app.get('/profile', isAuthenticated, (req, res) => {
    const user = getCurrentUser(req);
    const userPosts = posts.filter(p => p.username === user.username);
    res.render('profile', { user, posts: userPosts });
});

app.get('/avatar/:username', (req, res) => {
    const user = findUserByUsername(req.params.username);
    if (user) {
        res.sendFile(path.resolve(__dirname, 'avatars', `${user.username}.png`));
    } else {
        res.status(404).send('Avatar not found');
    }
});

app.post('/register', (req, res) => {
    registerUser(req, res);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    loginUser(req, res);
});

app.get('/logout', (req, res) => {
    logoutUser(req, res);
});

app.post('/delete/:id', isAuthenticated, (req, res) => {
    const postId = parseInt(req.params.id);
    posts = posts.filter(p => p.id !== postId || p.username !== getCurrentUser(req).username);
    res.redirect('/');
});

app.get('/auth/google', (req, res) => {
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    });
    res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({
        auth: client,
        version: 'v2',
    });

    const userinfo = await oauth2.userinfo.get();

    req.session.regenerate((err) => {
        if (err) return res.status(500).send('Failed to regenerate session');

        let user = findUserByUsername(userinfo.data.name);
        if (!user) {
            user = addUser(userinfo.data.name);
        }

        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    });
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Example data for posts and users
let posts = [
    { id: 1, title: 'Where does it come from?', content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Sit amet massa vitae tortor condimentum. Ut venenatis tellus in metus vulputate eu. Congue nisi vitae suscipit tellus mauris. Risus quis varius quam quisque id diam vel. Hendrerit gravida rutrum quisque non tellus orci ac auctor. Elementum sagittis vitae et leo duis ut diam. Ac tortor vitae purus faucibus. Feugiat sed lectus vestibulum mattis ullamcorper velit. Nunc sed blandit libero volutpat sed cras. Non diam phasellus vestibulum lorem sed risus ultricies tristique. Dictum at tempor commodo ullamcorper. Arcu vitae elementum curabitur vitae nunc sed velit. Tincidunt augue interdum velit euismod in pellentesque massa placerat duis. Nec feugiat in fermentum posuere urna nec. Commodo quis imperdiet massa tincidunt nunc pulvinar sapien et ligula. Aliquam faucibus purus in massa.', username: 'NauseatingDoubtful', timestamp: '2024-01-01 10:00', likes: 0  },
    { id: 2, title: 'Are we Alone?', content: 'Quis imperdiet massa tincidunt nunc pulvinar sapien et ligula. Dui accumsan sit amet nulla facilisi morbi tempus. Nunc scelerisque viverra mauris in aliquam sem fringilla. Massa sapien faucibus et molestie ac. Imperdiet dui accumsan sit amet nulla. Iaculis at erat pellentesque adipiscing commodo elit. Scelerisque viverra mauris in aliquam sem fringilla ut morbi. Eget nullam non nisi est sit. Amet dictum sit amet justo. Nisl vel pretium lectus quam id leo. Suspendisse in est ante in nibh mauris. Sit amet consectetur adipiscing elit ut aliquam purus sit amet. Sit amet commodo nulla facilisi nullam vehicula. Eget nulla facilisi etiam dignissim diam quis enim. Mattis pellentesque id nibh tortor id aliquet lectus proin. Vulputate ut pharetra sit amet aliquam id diam maecenas ultricies. Nam at lectus urna duis convallis convallis. Mauris vitae ultricies leo integer malesuada. Urna neque viverra justo nec ultrices dui sapien eget mi.', username: 'CookingShattered', timestamp: '2024-01-02 12:00', likes: 0 },
];

let users = [
    { id: 1, username: 'SampleUser', avatar_url: undefined, memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'AnotherUser', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
];

// Function to find a user by username
function findUserByUsername(username) {
    return users.find(user => user.username === username);
}

// Function to find a user by user ID
function findUserById(userId) {
    return users.find(user => user.id === userId);
}

function getTime() {
    const date = new Date();
    return `${date.toISOString().split('T')[0]} ${date.toTimeString().split(' ')[0]}`;
}

// Function to add a new user
function addUser(username) {
    const user = { id: users.length + 1, username, avatar_url: undefined, memberSince: getTime() };
    users.push(user);
    return user;
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/loginRegister');
    }
}

// Function to register a user
function registerUser(req, res) {
    const { username } = req.body;
    if (findUserByUsername(username)) {
        res.redirect('/login?error=Username+already+exists');
    } else {
        addUser(username);
        res.redirect('/login');
    }
}

// Function to login a user
function loginUser(req, res) {
    const { username } = req.body;
    const user = findUserByUsername(username);
    if (user) {
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.redirect('/login?error=Invalid+username');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    req.session.destroy(err => {
        if (err) {
            console.error('Error logging out:', err);
            res.status(500).send('Error logging out');
        } else {
            res.clearCookie('connect.sid');
            res.redirect('/');
        }
    });
}

// Function to get the current user from session
function getCurrentUser(req) {
    return findUserById(req.session.userId);
}

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
function addPost(title, content, user) {
    posts.push({ id: posts.length + 1, title, content, username: user.username, timestamp: getTime(), likes: 0 });
}





// Add route for submitting comments
app.post('/comment/:id', isAuthenticated, (req, res) => {
    const postId = parseInt(req.params.id);
    const comment = req.body.comment;
    // Find the post by ID
    const postIndex = posts.findIndex(post => post.id === postId);
    if (postIndex !== -1) {
        // Add the comment to the post
        if (!posts[postIndex].comments) {
            posts[postIndex].comments = [];
        }
        posts[postIndex].comments.push({ user: req.session.userId, comment });
        res.redirect('/');
    } else {
        res.status(404).send('Post not found');
    }
});
