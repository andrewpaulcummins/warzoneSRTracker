import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws'; 
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Get __dirname in ES modules by converting the import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let srData = {
    rank: "Bronze 1",
    currentSR: 0,
    dailySR: 0,
    rankImage: "images/bronze1.png"
};

const clients = new Set();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
const client = new MongoClient(process.env.MONGO_URI);
const db = client.db('warzoneTracker');
const licenseCollection = db.collection('license_keys');

// Middleware to handle MongoDB connection
async function connectToDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection failed:', err);
    }
}

// Debugging: Log all documents in the collection
async function logAllLicenses() {
    try {
        const allLicenses = await licenseCollection.find().toArray();
        console.log("All licenses in DB:", allLicenses);
    } catch (err) {
        console.error('Error fetching licenses:', err);
    }
}

// Validate the license key
app.post("/validate-license", async (req, res) => {
    const { licenseKey } = req.body;

    console.log("License Key to validate:", licenseKey);  // Log the key

    try {
        // Check if the license exists and is not already used
        const license = await licenseCollection.findOne({ key: licenseKey, used: false });
        console.log("License found:", license);

        if (license) {
            // Mark the license as used
            await licenseCollection.updateOne({ key: licenseKey }, { $set: { used: true } });

            res.status(200).json({ valid: true });
        } else {
            res.status(400).json({ valid: false, message: "Invalid or already used license key" });
        }
    } catch (err) {
        console.error('Error during license validation:', err);
        res.status(500).json({ valid: false, message: "Server error" });
    }
});

// Fetch SR data
app.get("/sr-data", (req, res) => {
    console.log("Sending SR Data:", srData);
    res.json({
        rank: srData.rank || "Bronze 1",
        currentSR: srData.currentSR ?? 0,
        dailySR: srData.dailySR ?? 0,
        rankImage: srData.rankImage || ""
    });
});

// Update SR data
app.post("/update-sr", (req, res) => {
    const { startSR, currentSR } = req.body;

    if (typeof currentSR !== "number" || isNaN(currentSR)) {
        return res.status(400).json({ error: "Invalid SR data" });
    }

    srData.currentSR = currentSR;
    srData.dailySR = (currentSR - startSR) || 0;

    const ranks = [
        { name: "Bronze 1", sr: 0, image: "images/bronze1.png" },
        { name: "Bronze 2", sr: 300, image: "images/bronze2.png" },
        { name: "Bronze 3", sr: 600, image: "images/bronze3.png" },
        { name: "Silver 1", sr: 900, image: "images/silver1.png" },
        { name: "Silver 2", sr: 1200, image: "images/silver2.png" },
        { name: "Silver 3", sr: 1500, image: "images/silver3.png" },
        { name: "Gold 1", sr: 2100, image: "images/gold1.png" },
        { name: "Gold 2", sr: 2400, image: "images/gold2.png" },
        { name: "Gold 3", sr: 2700, image: "images/gold3.png" },
        { name: "Platinum 1", sr: 3600, image: "images/platinum1.png" },
        { name: "Platinum 2", sr: 4200, image: "images/platinum2.png" },
        { name: "Platinum 3", sr: 4600, image: "images/platinum3.png" },
        { name: "Diamond 1", sr: 5400, image: "images/diamond1.png" },
        { name: "Diamond 2", sr: 5700, image: "images/diamond2.png" },
        { name: "Diamond 3", sr: 6000, image: "images/diamond3.png" },
        { name: "Crimson 1", sr: 7500, image: "images/crimson1.png" },
        { name: "Crimson 2", sr: 7800, image: "images/crimson2.png" },
        { name: "Crimson 3", sr: 8100, image: "images/crimson3.png" },
        { name: "Iridescent", sr: 10000, image: "images/iridescent.png" }
    ];

    for (let i = ranks.length - 1; i >= 0; i--) {
        if (currentSR >= ranks[i].sr) {
            srData.rank = ranks[i].name;
            srData.rankImage = ranks[i].image;
            break;
        }
    }

    console.log("Updated SR Data:", srData);

    updateSRData(srData);

    res.status(200).json({ message: "SR data updated successfully" });
});

// WebSocket communication
wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify(srData));

    ws.on('close', () => {
        clients.delete(ws);
    });
});

// Update SR data for all connected clients
function updateSRData(newData) {
    srData = { ...srData, ...newData };

    console.log("Broadcasting SR Data:", srData);

    clients.forEach(client => {
        client.send(JSON.stringify({
            rank: srData.rank,
            currentSR: srData.currentSR ?? 0,
            dailySR: srData.dailySR ?? 0,
            rankImage: srData.rankImage || ""
        }));
    });
}

server.listen(3000, async () => {
    await connectToDB(); // Ensure MongoDB connection before starting server
    console.log("Server is running on port 3000");
});
