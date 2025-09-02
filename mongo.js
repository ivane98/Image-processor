// import { MongoClient } from "mongodb";

// const uri =
//   "mongodb+srv://root:pass123@default.8sh2iea.mongodb.net/image-processing?retryWrites=true&w=majority&appName=default";

// const dbClient = new MongoClient(uri);

// async function main() {
//   try {
//     await dbClient.connect();
//     await listDatabases(dbClient);
//   } catch (e) {
//     console.error(e);
//   } finally {
//     await dbClient.close();
//   }
// }

// async function listDatabases(dbClient) {
//   let databasesList = await dbClient.db().admin().listDatabases();

//   console.log("Databases:");
//   databasesList.databases.forEach((db) => console.log(` - ${db.name}`));
// }

// async function createListing(client, newListing) {
//   const result = await client
//     .db("sample_mflix")
//     .collection("listingsAndReviews")
//     .insertOne(newListing);
//   console.log(
//     `New listing created with the following id: ${result.insertedId}`
//   );
// }

// // await createListing(dbClient, {
// //   name: "Lovely Loft",
// //   summary: "A charming loft in Paris",
// //   bedrooms: 1,
// //   bathrooms: 1,
// // });

// async function findOneListingByName(client, nameOfListing) {
//   const result = await client
//     .db("sample_mflix")
//     .collection("listingsAndReviews")
//     .findOne({ name: nameOfListing });

//   if (result) {
//     console.log(
//       `Found a listing in the collection with the name '${nameOfListing}':`
//     );
//     console.log(result);
//   } else {
//     console.log(`No listings found with the name '${nameOfListing}'`);
//   }
// }

// await findOneListingByName(dbClient, "Lovely Loft");

// main().catch(console.error);

// const mongoose = require('mongoose');

import mongoose from "mongoose";

const kittySchema = new mongoose.Schema({
  name: String,
});

async function main() {
  await mongoose.connect(
    "mongodb+srv://root:pass123@default.8sh2iea.mongodb.net/default?retryWrites=true&w=majority&appName=default"
  );

  console.log("connected");
}

main().catch((err) => console.log(err));
