const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://tradeflow-db:Ovjt6ijvwKBwVyR9@cluster-first-server-ap.bcgcgzv.mongodb.net/?appName=Cluster-first-server-app";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    // mongo db setup
    const db = client.db("tradeflow-db");
    const cardCollection = db.collection("cards");
    const importCollection = db.collection("import");

    // bbbbbbbbbbbbbbbbbbbbb
    // app.post("/cards/:id/import", async (req, res) => {
    //   try {
    //     const { id } = req.params;
    //     const qty = parseInt(req.body.qty, 10);

    //     if (!ObjectId.isValid(id) || !qty || qty <= 0)
    //       return res
    //         .status(400)
    //         .send({ success: false, message: "Invalid input" });

    //     const result = await cardCollection.findOneAndUpdate(
    //       { _id: new ObjectId(id), quantity: { $gte: qty } },
    //       { $inc: { quantity: -qty } },
    //       { returnDocument: "after" }
    //     );

    //     const updated = result?.value || result;
    //     if (!updated)
    //       return res
    //         .status(400)
    //         .send({ success: false, message: "Not enough quantity" });
    //     console.log(updated);
    //     res.send({ success: true, card: updated });
    //   } catch (err) {
    //     res.status(500).send({ success: false, message: "Server error" });
    //   }
    // });

    // ddddddddddddddddddddddd

    app.post("/cards/:id/import", async (req, res) => {
      try {
        const { id } = req.params;
        const qty = parseInt(req.body.qty, 10);

        if (!ObjectId.isValid(id) || !qty || qty <= 0) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid input" });
        }

        // Step 1: Quantity কমাও
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

        // Step 2: Import collection এ insert করো
        const importRecord = {
          cardId: new ObjectId(id),
          qty,
          date: new Date(),
          image: updated.image,
          cardName: updated.name, // চাইলে কার্ডের নামও রাখতে পারো
          remainingQty: updated.quantity, // এখনকার অবশিষ্ট সংখ্যা
        };

        await importCollection.insertOne(importRecord);

        // Step 3: Response পাঠাও
        res.send({ success: true, card: updated, importRecord });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });
    //

    app.get("/import-card", async (req, res) => {
      const result = await importCollection.find().toArray();
      res.send(result);
    });
    // get
    // find
    // findOne()
    //
    app.get("/cards", async (req, res) => {
      const result = await cardCollection.find().toArray();
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
    await client.db("admin").command({ ping: 1 });
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
