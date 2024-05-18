//========================================
// Set Up
//========================================
const express = require("express")
const handlebars = require("express-handlebars");
const app = express();
const hbs = handlebars.create(); //handle bar engine

app.use(express.static('public'));

app.engine("handlebars" , hbs.engine); //rendering engine
app.set("view engine", "handlebars");

const port = 3000;

//========================================
// Middleware
//========================================



//========================================
// Routes
//========================================

app.get("/", (req, res)=>{
    res.render("home");
});

app.get("/loginRegister", (req, res)=>{
    res.render("loginRegister");
});

//========================================
// Server Activation
//========================================
app.listen(port, () => {
    console.log(`Server has started on port ${port}.`);
});