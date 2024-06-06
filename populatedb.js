// populatedb.js

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Placeholder for the database file name
const dbFileName = 'blogData.db';

async function initializeDB() {
    console.log('Opening database file:', dbFileName);
    let db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    console.log('initializing');
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            postId TEXT,
            comment TEXT,
            username TEXT,
            timestamp DATETIME
        );
    `);

    console.log('initial data');
    // Sample data - Replace these arrays with your own data
    const users = [
        { username: 'user1', hashedGoogleId: 'hashedGoogleId1', avatar_url: '', memberSince: '2024-01-01 12:00:00' },
        { username: 'user2', hashedGoogleId: 'hashedGoogleId2', avatar_url: '', memberSince: '2024-01-02 12:00:00' }
    ];

    const posts = [
        { title: 'First Post', content: 'This is the first post', username: 'user1', timestamp: '2024-01-01 12:30:00', likes: 0 },
        { title: 'Second Post', content: 'This is the second post', username: 'user2', timestamp: '2024-01-02 12:30:00', likes: 0 }
    ];

    const comments = [
        { postId: 1, comment: 'yepepep', username: 'user1', timestamp: '2024-01-01 12:30:00' },
        { postId: 1, comment: 'yepe', username: 'user1', timestamp: '2024-01-01 12:30:00' }
    ];

    // Insert sample data into the database
    await Promise.all(comments.map(comment => {
        console.log(comment.postId, comment.comment, comment.username, comment.timestamp);
        return db.run(
            'INSERT INTO comments (postId, comment, username, timestamp) VALUES (?, ?, ?, ?)',
            [comment.postId, comment.comment, comment.username, comment.timestamp]
        );
    }));


    // Insert sample data into the database
    await Promise.all(users.map(user => {
        console.log(user.username, user.hashedGoogleId, user.avatar_url, user.memberSince);
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
        );
    }));

    await Promise.all(posts.map(post => {
        console.log(post.title, post.content, post.username, post.timestamp, post.likes)
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});

module.export = initializeDB;