const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// console.log(process.env);
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster-first-server-ap.bcgcgzv.mongodb.net/?appName=Cluster-first-server-app`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // mongo db setup
    const db = client.db("tradeflow-db");
    const cardCollection = db.collection("cards");
    const importCollection = db.collection("import");
    const contactCollection = db.collection("contacts");
    const userCollection = db.collection("users");
    // ddddddddddddddddddddddd
    // user related api
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find().sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });
    //
    // Change role
    app.patch("/users/:id", async (req, res) => {
      const { id } = req.params;
      const updateRole = req.body; // { role: "admin" }

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateRole }
      );

      res.send(result);
    });
    // role
    app.get("/users/:email/role", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ role: user?.role || "user" });
    });
    app.post("/users", async (req, res) => {
      const user = req.body;

      const existing = await userCollection.findOne({ email: user.email });
      if (existing) {
        return res.send({ message: "User already exists" });
      }

      user.role = "user";
      user.createdAt = new Date();

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //
    app.post("/cards/:id/import", async (req, res) => {
      try {
        const { id } = req.params;
        const qty = parseInt(req.body.qty, 10);

        if (!ObjectId.isValid(id) || !qty || qty <= 0) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid input" });
        }

        const result = await cardCollection.findOneAndUpdate(
          { _id: new ObjectId(id), quantity: { $gte: qty } },
          { $inc: { quantity: -qty } },
          { returnDocument: "after" }
        );

        const updated = result?.value || result;
        if (!updated) {
          return res
            .status(400)
            .send({ success: false, message: "Not enough quantity" });
        }

        const importRecord = {
          cardId: new ObjectId(id),
          qty,
          date: new Date(),
          image: updated.image,
          cardName: updated.name,
          remainingQty: updated.quantity,
        };

        await importCollection.insertOne(importRecord);

        res.send({ success: true, card: updated, importRecord });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });
    //

    app.get("/import-card", async (req, res) => {
      const result = await importCollection.find().sort({ date: -1 }).toArray();
      res.send(result);
    });
    //
    //
    // remove
    app.delete("/import-card/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "no data" });
      }

      try {
        const result = await importCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ success: false, message: "no data" });
        }

        return res.json({ success: true, deletedId: id });
      } catch (err) {
        console.error("Delete error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Server error" });
      }
    });
    // get
    // find
    // findOne()
    //
    app.get("/cards", async (req, res) => {
      const result = await cardCollection
        .find()
        .sort({ createdAT: -1 })
        .toArray();
      res.send(result);
    });
    // home get
    app.get("/latest-cards", async (req, res) => {
      const result = await cardCollection
        .find()
        .sort({ createdAT: -1 })
        .limit(6)
        .toArray();
      res.send({
        success: true,
        result,
      });
    });
    // get email ar jonno
    app.get("/my-export", async (req, res) => {
      const email = req.query.email;
      const result = await cardCollection
        .find({
          created_by: email,
        })
        .sort({
          createdAT: -1,
        })
        .toArray();
      res.send(result);
    });
    // details
    app.get("/cards/:id", async (req, res) => {
      const { id } = req.params;
      // console.log(id);
      const result = await cardCollection.findOne({ _id: new ObjectId(id) });
      res.send({
        success: true,
        result,
      });
    });
    // post
    // insrtOne()
    app.post("/cards", async (req, res) => {
      const data = req.body;
      // console.log(data);
      const result = await cardCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });
    // update
    app.patch("/cards/:id", async (req, res) => {
      const id = req.params.id;
      const updateCards = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updateCards,
        // $set: {
        //   name: updateCards.name,
        //   price: updateCards.price,
        // },
      };
      const result = await cardCollection.updateOne(query, update);
      res.send(result);
    });
    // delete
    app.delete("/cards/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cardCollection.deleteOne(query);
      res.send(result);
    });
    // search
    app.get("/search", async (req, res) => {
      const search = req.query.search;
      const result = await cardCollection
        .find({ name: { $regex: search, $options: "i" } })
        .toArray();
      res.send(result);
    });
    // contact
    app.post("/contact", async (req, res) => {
      try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
          return res
            .status(400)
            .send({ success: false, message: "All fields required" });
        }

        const contactInfo = {
          name,
          email,
          message,
          createdAt: new Date(),
        };

        const result = await contactCollection.insertOne(contactInfo);

        res.send({
          success: true,
          message: "Message sent successfully",
          insertedId: result.insertedId,
        });
      } catch (err) {
        console.error("Contact Error:", err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    //
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World! tradflow app ");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
