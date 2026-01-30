const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const productRoutes = require("./routes/productRoutes");
app.use("/", productRoutes);

app.listen(process.env.PORT, () => {
    console.log("Server running...");
});
