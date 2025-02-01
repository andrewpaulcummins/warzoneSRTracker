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
const License = mongoose.model("License", licenseSchema);

// Function to insert a new license key
async function insertLicenseKey(key) {
  await License.create({ key, used: false });
  console.log(`License key ${key} inserted successfully.`);
  mongoose.connection.close();
}

// Insert a new key (replace with your key)
insertLicenseKey("LICENSE-KEY-12345");
