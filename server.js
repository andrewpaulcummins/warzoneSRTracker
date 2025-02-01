import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import readline from 'readline';

dotenv.config();

const app = express();
const port = 3000;
app.use(express.static('public'));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Define License Key Schema
const licenseSchema = new mongoose.Schema({
    key: String,
    used: { type: Boolean, default: false }
});
const License = mongoose.model('License', licenseSchema);

let srData = {
    rank: "Bronze 1",
    currentSR: 0,
    dailySR: 0
};

// Endpoint to validate license key
app.post('/validate-key', async (req, res) => {
    const { licenseKey } = req.body;
    const validKey = await License.findOne({ key: licenseKey });
    res.json({ valid: !!validKey });
});

// Endpoint to get SR data
app.get('/sr-data', (req, res) => {
    res.json(srData);
});

// Endpoint to update SR data from the terminal
app.post('/update-sr', async (req, res) => {
    const { startSR, currentSR, licenseKey } = req.body;
    const validKey = await License.findOne({ key: licenseKey });
    if (!validKey) {
        return res.status(403).json({ error: "Invalid license key" });
    }

    srData.currentSR = currentSR;
    srData.dailySR = currentSR - startSR;

    // Determine rank based on SR
    const ranks = [
        { name: "Bronze 1", sr: 0 },
        { name: "Bronze 2", sr: 300 },
        { name: "Bronze 3", sr: 600 },
        { name: "Silver 1", sr: 900 },
        { name: "Silver 2", sr: 1200 },
        { name: "Silver 3", sr: 1500 },
        { name: "Gold 1", sr: 2100 },
        { name: "Gold 2", sr: 2400 },
        { name: "Gold 3", sr: 2700 },
        { name: "Platinum 1", sr: 3600 },
        { name: "Platinum 2", sr: 4200 },
        { name: "Platinum 3", sr: 4600 },
        { name: "Diamond 1", sr: 5400 },
        { name: "Diamond 2", sr: 5700 },
        { name: "Diamond 3", sr: 6000 },
        { name: "Crimson 1", sr: 7500 },
        { name: "Crimson 2", sr: 7800 },
        { name: "Crimson 3", sr: 8100 },
        { name: "Iridescent", sr: 10000 }
    ];
    
    for (let i = ranks.length - 1; i >= 0; i--) {
        if (currentSR >= ranks[i].sr) {
            srData.rank = ranks[i].name;
            break;
        }
    }

    console.log(`Updated SR: ${currentSR}, Rank: ${srData.rank}, Daily SR Gain: ${srData.dailySR}`);
    res.sendStatus(200);
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    askForSRInput();
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askForSRInput() {
    rl.question('Enter your license key: ', (licenseKey) => {
        rl.question('Enter starting SR: ', (startSR) => {
            rl.question('Enter current SR: ', (currentSR) => {
                fetch(`http://localhost:${port}/update-sr`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startSR: parseInt(startSR), currentSR: parseInt(currentSR), licenseKey })
                }).then(() => askForSRInput());
            });
        });
    });
}

askForSRInput();
