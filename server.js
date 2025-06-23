import express from "express";
import mongoose from "mongoose";
import { createClient } from "redis";

const app = express();

const client = await createClient()
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();

mongoose.connect("mongodb://localhost:27017/node_cache");

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  specs: Object,
});

const Product = mongoose.model("Product", productSchema);

app.get("/api/products", async (req, res) => {


    const key = generateCacheKey(req);

    const cachedProducts = await client.get(key);

    if (cachedProducts) {
        res.json(JSON.parse(cachedProducts));
        return;
    }


  const query = {};

  if (req.query.category) {
    query.category = req.query.category;
  }

  const products = await Product.find(query);

  if (products.length) {
    await client.set(key, JSON.stringify(products), {
     // EX: 60, // Cache for 60 seconds
    });
    
  }

  return res.json(products);
});


function generateCacheKey(req){
     const baseUrl = req.path.replace(/^\/+|\/+$/g, '').replace(/\//g, ':');
     const params = req.query;
     const sortedParams = Object.keys(params).sort().map((key) => `${key}:${params[key]}`).join('&');

     return sortedParams ? `${baseUrl}:${sortedParams}` : baseUrl;
}


app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
