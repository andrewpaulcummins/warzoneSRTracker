import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB connection error:", err));

// Define License Schema
const licenseSchema = new mongoose.Schema({
  key: String,
  used: { type: Boolean, default: false }
});

// Specify the database and collection where the schema will be used
const License = mongoose.model("License", licenseSchema, "license_keys");

// Function to insert a new license key into the "license_keys" collection
async function insertLicenseKey(key) {
  try {
    const newLicense = new License({ key, used: false });
    await newLicense.save();  // Save the new license to the DB
    console.log(`License key ${key} inserted successfully into the 'license_keys' collection.`);
  } catch (err) {
    console.error("Error inserting license key:", err);
  } finally {
    mongoose.connection.close();  // Close the connection after the operation
  }
}

// Insert a new key (replace with your key)
insertLicenseKey("apendii_432498223");
