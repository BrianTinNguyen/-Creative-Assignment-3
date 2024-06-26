//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Imports
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const express = require('express');                       // Use express
const expressHandlebars = require('express-handlebars');  // Session live on server, we save on db, secure  
const session = require('express-session');

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

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
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HandleBars
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
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
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'MicroBloog';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = (req.session.loggedIn || false);
    res.locals.userId = req.session.userId || '';
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

/*
// Ensure the database is initialized before starting the server.
initializeDB().then(() => {
    console.log('Database initialized. Server starting...');
    app.listen(3000, () => {
        console.log('Server running on http://localhost:3000');
    });
}).catch(err => {
    console.error('Failed to initialize the database:', err);
});
*/

// Configure passport
passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/google/callback`
}, (token, tokenSecret, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
/*
app.get('/user-count', (req, res) => {
    db.all('SELECT COUNT(*) AS count FROM users')
        .then(result => {
            const count = result[0].count;
            res.send(`Total users: ${count}`);
        })
        .catch(err => {
            console.error('Error querying database:', err);
            res.status(500).send('Failed to retrieve data');
        });
});

app.get('/', async (req, res) => {
    try{
        const posts = await db.allAsync('SELECT * FROM posts');
        res.render('home', { posts: posts});
    } catch(err){
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
    const user = getCurrentUser(req) || {};
});
*/

app.get('/', async (req, res) => {
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
    res.render('home', { posts: posts });
});



// Register GET route is used for error response from registration
//
app.get('/loginRegister', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement


app.get('/post/:id', (req, res) => {
    // TODO: Render post detail page
    //res.render('posts', getPosts());
    res.render('/', posts);
});
app.post('/posts', (req, res) => {
    // TODO: Add a new post and redirect to home
    const {title, content} = req.body;
    addPost(title, content, getCurrentUser(req));
    res.redirect('/');
});
app.post('/like/:id', (req, res) => {
    // TODO: Update post likes
});
app.get('/profile', isAuthenticated, (req, res) => {        // <-------protected route
});
app.get('/avatar/:username', (req, res) => {
    // TODO: Serve the avatar image for the user
});

app.post('/register', (req, res) => {
    // TODO: Register a new user
    registerUser(req, res);
});

app.post('/login', (req, res) => {                          //<-----------------------
    const { username, password } = req.body;

    console.log('Received login request:', username, password); // Log received email and password
    
    req.session.regenerate((err) => {
        if(err){
            //res.redirect('/login?error=Invalid+username');
            return res.status(500).send('Failed to regenerate session');
        }
        
        //req.session.userId = 'user-id';
        loginUser(req, res);
        //console.log(res.locals.loggedIn);
        //res.redirect('/');
        //res.send('Logged In');
        
    })

    /*
    // Hardcoded check for demonstration purposes
    if (email === 'w@w' && password === '12') {
        console.log('Login successful.'); // Log successful login
        req.session.loggedIn = true;
        req.session.userId = 1; // Assuming a user ID
        console.log('Session variables set:', req.session); // Log session variables
        res.redirect('/'); // Redirect to profile page or any other desired page
    } else {
        console.log('Login failed.'); // Log login failure
        res.redirect('/loginRegister?error=Invalid credentials');
    }*/
});

app.get('/logout', (req, res) => {
    // TODO: Logout the user
   /* req.session.destroy((err) => {
        if(err){
            return res.status(500).send('Failed to logout');
        }*/
        logoutUser(req, res);
        //res.clearCookie('sessionId');
        //res.send('Logged Out');
    //})
});

app.post('/delete/:id', isAuthenticated, (req, res) => {
    // TODO: Delete a post if the current user is the owner
});

// Redirect to Google's OAuth 2.0 server
app.get('/auth/google', (req, res) => {
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    });
    res.redirect(url);
});

// Handle OAuth 2.0 server response
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
        if(err){
            //res.redirect('/login?error=Invalid+username');
            return res.status(500).send('Failed to regenerate session');
        }

        let user = findUserByUsername(userinfo.data.name);
        if(!user){ //if username already used, redirect error
            console.log("Adding user");
            user = addUser(userinfo.data.name);
            console.log(JSON.stringify(users, null, 2));
        }

        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');    
    })
    /*res.send(`
        <h1>Hello, ${userinfo.data.name}</h1>
        <p>Email: ${userinfo.data.email}</p>
        <img src="${userinfo.data.picture}" alt="Profile Picture">
        <br>
        <a href="/logout">Logout from App</a>
        <br>
    `);*/
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
    { id: 1, title: 'Sample Post', content: 'This is a sample post.', username: 'SampleUser', timestamp: '2024-01-01 10:00', likes: 0 },
    { id: 2, title: 'Another Post', content: 'This is another sample post.', username: 'AnotherUser', timestamp: '2024-01-02 12:00', likes: 0 },
];
let users = [
    { id: 1, username: 'SampleUser', avatar_url: undefined, memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'AnotherUser', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
];

// Function to find a user by username
function findUserByUsername(username) {
    // TODO: Return user object if found, otherwise return undefined
    for(let i = 0; i < users.length; i++){
        if(users[i].username === username){
            return users[i];
        }
    }
    return null;
}

// Function to find a user by user ID
function findUserById(userId) {
    // TODO: Return user object if found, otherwise return undefined
    for(let i = 0; i < users.length; i++){
        if(users[i].id === userId){
            return users[i];
        }
    }
    return null;
}

function getTime() {
    const date = new Date();
    const dateString = date.toISOString();
    const day = dateString.split('T')[0];
    const hour = dateString.split('T')[1].split(':').slice(0, 2).join(':');
    return day + " " + hour;
}

// Function to add a new user
function addUser(username) {
    // TODO: Create a new user object and add to users array
    const user = {id: (users.length) + 1, username: username, avatar_url: undefined, memberSince: getTime()}
    users.push(user);
    return user;
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {                  //<-----------------------
    console.log(req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/loginRegister');
    }
}

// Function to register a user
function registerUser(req, res) {
    // TODO: Register a new user and redirect appropriately
    const username = req.body.username;
    console.log("Checking register:", username);

    if(findUserByUsername(username)){ //if username already used, redirect error
        console.log("Already Exists");
        res.redirect('/login?error=Username+already+exists');
    }
    else{   //if username new, add username
        console.log("Adding user");
        addUser(username);
        console.log(JSON.stringify(users, null, 2));
        res.redirect('/login');
    }
    
}

// Function to login a user
function loginUser(req, res) {
    // TODO: Login a user and redirect appropriately
    const username = req.body.username;
    console.log("Checking users:", username);
    const user = findUserByUsername(username);

    if(user){
        console.log("Found");
        req.session.userId = user.id;
        req.session.loggedIn = true;
        
        res.redirect('/');
    }
    else{
        console.log("Not found");
        res.redirect('/login?error=Invalid+username');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    // TODO: Destroy session and redirect appropriately
    req.session.destroy((err) => {
        if(err){    //if error display error
            console.error('Error logout:', err);
            //res.redirect('/error'); //redirect to error page
        }
        else{   //if no error
            res.clearCookie('sessionId');
            res.redirect('/'); // redirect to home page
        }
    })
}

// Function to render the profile page
function renderProfile(req, res) {
    // TODO: Fetch user posts and render the profile page
}

// Function to update post likes
function updatePostLikes(req, res) {
    // TODO: Increment post likes if conditions are met
}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    // TODO: Generate and serve the user's avatar image
}

// Function to get the current user from session
function getCurrentUser(req) {
    // TODO: Return the user object if the session user ID matches
    if(req.session.userId){
        return findUserById(req.session.userId);
    }
    else{
        return null;
    }
}

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
function addPost(title, content, user) {
    // TODO: Create a new post object and add to posts array
    console.log(user);
    posts.push({id: (posts.length) - 1, title: title, content: content, username: user.username, timestamp: getTime(), likes: 0});
}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    // TODO: Generate an avatar image with a letter
    // Steps:
    // 1. Choose a color scheme based on the letter
    // 2. Create a canvas with the specified width and height
    // 3. Draw the background color
    // 4. Draw the letter in the center
    // 5. Return the avatar as a PNG buffer
}