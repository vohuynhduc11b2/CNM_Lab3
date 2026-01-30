const express = require("express");
const router = express.Router();
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const {
  ScanCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const docClient = require("../services/dynamoService");
const s3 = require("../services/s3Service");

require("dotenv").config();

// Multer config (lưu tạm file vào memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* =========================
   1. READ - Danh sách sản phẩm
========================= */
router.get("/", async (req, res) => {
  try {
    const data = await docClient.send(
      new ScanCommand({
        TableName: process.env.TABLE_NAME,
      })
    );

    res.render("index", { products: data.Items || [] });
  } catch (err) {
    console.error(err);
    res.send("Lỗi khi lấy danh sách sản phẩm");
  }
});

/* =========================
   2. FORM THÊM SẢN PHẨM
========================= */
router.get("/add", (req, res) => {
  res.render("add");
});

/* =========================
   3. CREATE - Thêm sản phẩm
========================= */
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { name, price, quantity } = req.body;
    const id = uuidv4();

    let imageUrl = "";

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;

      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      await s3.send(new PutObjectCommand(uploadParams));

      imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    }

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
          id,
          name,
          price: Number(price),
          quantity: Number(quantity),
          url_image: imageUrl,
        },
      })
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.send("Lỗi khi thêm sản phẩm");
  }
});

/* =========================
   4. FORM EDIT
========================= */
router.get("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id },
      })
    );

    res.render("edit", { product: data.Item });
  } catch (err) {
    console.error(err);
    res.send("Không tìm thấy sản phẩm");
  }
});

/* =========================
   5. UPDATE SẢN PHẨM
========================= */
router.post("/edit/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, quantity } = req.body;

    let updateExpression =
      "set #name = :name, price = :price, quantity = :quantity";
    let expressionValues = {
      ":name": name,
      ":price": Number(price),
      ":quantity": Number(quantity),
    };
    let expressionNames = { "#name": "name" };

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );

      const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      updateExpression += ", url_image = :url_image";
      expressionValues[":url_image"] = imageUrl;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionValues,
        ExpressionAttributeNames: expressionNames,
      })
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.send("Lỗi khi cập nhật sản phẩm");
  }
});

/* =========================
   6. DELETE SẢN PHẨM
========================= */
router.get("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin sản phẩm trước khi xóa
    const data = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id },
      })
    );

    const product = data.Item;

    // Xóa ảnh trên S3 nếu có
    if (product.url_image) {
      const key = product.url_image.split(".amazonaws.com/")[1];

      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
        })
      );
    }

    // Xóa DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id },
      })
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.send("Lỗi khi xóa sản phẩm");
  }
});

module.exports = router;
