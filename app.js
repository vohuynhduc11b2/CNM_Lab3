const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
require("dotenv").config();

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(methodOverride("_method"));

const productRoutes = require("./routes/productRoutes");
app.use("/", productRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server is running at http://localhost:${process.env.PORT}/`);
});