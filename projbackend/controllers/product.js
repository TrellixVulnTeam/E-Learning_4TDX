const Product = require("../models/product");
const formidable = require("formidable");
const _ = require("lodash");
const fs = require("fs");
const { sortBy } = require("lodash");
const { doUpload } = require("../file-upload/upload-controller");

exports.getProductById = (req, res, next, id) => {
  Product.findById(id)
    .populate("category")
    .exec((err, product) => {
      if (err) {
        return res.status(400).json({
          error: "Product not Found",
        });
      }
      req.product = product;
      next();
    });
};

exports.photo = (req, res, next) => {
  if (req.product.photo.data) {
    res.set("Content-Type", req.product.photo.contentType);
    return res.send(req.product.photo.data);
  }
  next();
};

exports.createProduct = (req, res) => {
  console.log("file -->", req.file);
  let newFile = {};
  if (req.file) {
    const files = req.file;
    const randomID = Math.random();
    const item = files;
    console.log("FILE", item);
    const regex = new RegExp("[^.]+$");
    const extension = item.originalname.match(regex);
    newFile = {
      fileName: item.originalname,
      url:
        "https://event-media-1.s3.us-east-2.amazonaws.com/posts/" +
        randomID +
        item.originalname,
      type: extension[0],
      key: "posts/" + randomID + item.originalname,
    };
    doUpload(newFile.key, item);
    console.log("FILE", newFile);
  }
  console.log("BODY", req.body.name);
  const pro = {
    ...req.body,
    file: newFile.url,
  };

  let product = new Product(pro);

  product.save((err, product) => {
    if (err) {
      console.log(err);
      res.status(400).json({
        error: "Saving Course in DB failed",
      });
    }
    res.json(product);
  });
};

exports.getProduct = (req, res) => {
  req.product.photo = undefined;
  return res.json(req.product);
};

exports.deleteProduct = (req, res) => {
  let product = req.product;
  product.remove((err, deletedProduct) => {
    if (err) {
      return res.status(400).json({
        error: "Failed to delete Product",
      });
    }
    res.json({
      message: "Deletion was a Success",
      deletedProduct,
    });
  });
};

exports.updateProduct = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;

  form.parse(req, (err, fields, file) => {
    if (err) {
      return res.status(400).json({
        error: "Problem with image",
      });
    }

    let product = req.product;
    product = _.extend(product, fields);

    if (file.photo) {
      if (file.photo.size > 3000000) {
        return res.status(400).json({
          error: "File size ",
        });
      }
      product.photo.data = fs.readFileSync(file.photo.path);
      product.photo.contentType = file.photo.type;
    }
    product.save((err, product) => {
      if (err) {
        res.status(400).json({
          error: "Updation of Course Failed",
        });
      }
      res.json(product);
    });
  });
};

exports.getAllProducts = (req, res) => {
  let limit = req.query.limit ? parseInt(req.query.limit) : 8;
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id";

  Product.find()
    .select("-photo")
    .populate("category")
    .sort([[sortBy, "asc"]])
    .limit(limit)
    .exec((err, products) => {
      if (err) {
        return res.status(400).json({
          error: "No Product Found",
        });
      }
      res.json(products);
    });
};

exports.getAllUniqueCategories = (req, res) => {
  Product.distinct("category", {}, (err, category) => {
    if (err) {
      return res.status(400).json({
        error: "No Category Found",
      });
    }
    res.json(category);
  });
};

exports.updateSold = (req, res, next) => {
  let myOperations = req.body.order.products.map((prod) => {
    return {
      updateOne: {
        filter: { _id: prod._id },
        update: { $inc: { sold: +prod.count } },
      },
    };
  });

  Product.bulkWrite(myOperations, {}, (err, products) => {
    if (err) {
      return res.status(400).json({
        error: "Bulk Operation Failed",
      });
    }
    next();
  });
};
