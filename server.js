import express from "express";            // Instead of common js "require" we are using import "ES"
const app = express();
const port = 3000;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


app.get("/", (req, res) => {
    res.send("Hello World!");
}),

app.get("/about", (req, res) => {
    res.send("<h1>About Me</h1>");
}),

app.get("/contact", (req, res) => {
    res.send("<h1>Contact Me</h1>");
}),



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.listen(port, () => {
    console.log(`Server has started on port ${port}.`);
});