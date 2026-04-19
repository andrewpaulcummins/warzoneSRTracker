import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const DEFAULT_SR_STATE = {
    rank: "Bronze 1",
    currentSR: 0,
    dailySR: 0,
    rankImage: "images/bronze1.png"
};

let srData = { ...DEFAULT_SR_STATE };
const clients = new Set();

app.use(express.static(path.join(__dirname, 'public')));

const mongoClient = new MongoClient(process.env.MONGO_URI);
const db = mongoClient.db('warzoneTracker');
const licenseCollection = db.collection('license_keys');
const srCollection = db.collection('sr_state');

async function connectToDB() {
    try {
        await mongoClient.connect();
        console.log('Connected to MongoDB');

        // Load last saved SR state on startup
        const saved = await srCollection.findOne({ _id: 'current' });
        if (saved) {
            const { _id, ...state } = saved;
            srData = state;
            console.log('Restored SR state:', srData);
        }
    } catch (err) {
        console.error('MongoDB connection failed:', err);
    }
}

async function persistSRState(state) {
    try {
        await srCollection.updateOne(
            { _id: 'current' },
            { $set: state },
            { upsert: true }
        );
    } catch (err) {
        console.error('Failed to persist SR state:', err);
    }
}

// Simple in-memory rate limiter: max 10 attempts per IP per minute
const rateLimitMap = new Map();
function isRateLimited(ip) {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxAttempts = 10;
    const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + windowMs;
    }
    record.count++;
    rateLimitMap.set(ip, record);
    return record.count > maxAttempts;
}

// Admin auth middleware
function requireAdmin(req, res, next) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return res.status(503).json({ error: 'Admin access not configured' });
    }
    const provided = req.headers['x-admin-password'];
    if (!provided || provided !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Health check
app.get('/health', async (req, res) => {
    try {
        await mongoClient.db().command({ ping: 1 });
        res.json({ status: 'ok', db: 'connected' });
    } catch {
        res.status(503).json({ status: 'error', db: 'disconnected' });
    }
});

// Validate license key
app.post('/validate-license', async (req, res) => {
    if (isRateLimited(req.ip)) {
        return res.status(429).json({ valid: false, message: 'Too many attempts. Try again later.' });
    }

    const { licenseKey } = req.body;
    if (typeof licenseKey !== 'string' || !licenseKey) {
        return res.status(400).json({ valid: false, message: 'Invalid license key format.' });
    }

    try {
        const license = await licenseCollection.findOne({ key: licenseKey, used: false });
        if (license) {
            await licenseCollection.updateOne({ key: licenseKey }, { $set: { used: true } });
            res.status(200).json({ valid: true });
        } else {
            res.status(400).json({ valid: false, message: 'Invalid or already used license key' });
        }
    } catch (err) {
        console.error('Error during license validation:', err);
        res.status(500).json({ valid: false, message: 'Server error' });
    }
});

// Fetch SR data
app.get('/sr-data', (req, res) => {
    res.json({
        rank: srData.rank || 'Bronze 1',
        currentSR: srData.currentSR ?? 0,
        dailySR: srData.dailySR ?? 0,
        rankImage: srData.rankImage || ''
    });
});

// Update SR data — requires an activated license key
app.post('/update-sr', async (req, res) => {
    const { startSR, currentSR, licenseKey } = req.body;

    if (typeof licenseKey !== 'string' || !licenseKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const license = await licenseCollection.findOne({ key: licenseKey, used: true });
        if (!license) return res.status(403).json({ error: 'Unauthorized' });
    } catch (err) {
        console.error('Error verifying license:', err);
        return res.status(500).json({ error: 'Server error' });
    }

    if (typeof currentSR !== 'number' || isNaN(currentSR)) {
        return res.status(400).json({ error: 'Invalid SR data' });
    }

    srData.currentSR = currentSR;
    srData.dailySR = (currentSR - startSR) || 0;

    const ranks = [
        { name: 'Bronze 1', sr: 0, image: 'images/bronze1.png' },
        { name: 'Bronze 2', sr: 300, image: 'images/bronze2.png' },
        { name: 'Bronze 3', sr: 600, image: 'images/bronze3.png' },
        { name: 'Silver 1', sr: 900, image: 'images/silver1.png' },
        { name: 'Silver 2', sr: 1200, image: 'images/silver2.png' },
        { name: 'Silver 3', sr: 1500, image: 'images/silver3.png' },
        { name: 'Gold 1', sr: 2100, image: 'images/gold1.png' },
        { name: 'Gold 2', sr: 2400, image: 'images/gold2.png' },
        { name: 'Gold 3', sr: 2700, image: 'images/gold3.png' },
        { name: 'Platinum 1', sr: 3600, image: 'images/platinum1.png' },
        { name: 'Platinum 2', sr: 4200, image: 'images/platinum2.png' },
        { name: 'Platinum 3', sr: 4600, image: 'images/platinum3.png' },
        { name: 'Diamond 1', sr: 5400, image: 'images/diamond1.png' },
        { name: 'Diamond 2', sr: 5700, image: 'images/diamond2.png' },
        { name: 'Diamond 3', sr: 6000, image: 'images/diamond3.png' },
        { name: 'Crimson 1', sr: 7500, image: 'images/crimson1.png' },
        { name: 'Crimson 2', sr: 7800, image: 'images/crimson2.png' },
        { name: 'Crimson 3', sr: 8100, image: 'images/crimson3.png' },
        { name: 'Iridescent', sr: 10000, image: 'images/iridescent.png' }
    ];

    for (let i = ranks.length - 1; i >= 0; i--) {
        if (currentSR >= ranks[i].sr) {
            srData.rank = ranks[i].name;
            srData.rankImage = ranks[i].image;
            break;
        }
    }

    await persistSRState(srData);
    updateSRData(srData);

    res.status(200).json({ message: 'SR data updated successfully' });
});

// Admin — list all license keys
app.get('/admin/keys', requireAdmin, async (req, res) => {
    try {
        const keys = await licenseCollection.find({}, { projection: { _id: 0 } }).toArray();
        res.json(keys);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin — generate a new license key
app.post('/admin/generate-key', requireAdmin, async (req, res) => {
    try {
        const key = randomBytes(16).toString('hex');
        await licenseCollection.insertOne({ key, used: false });
        res.status(201).json({ key });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin — reset a used key back to unused
app.patch('/admin/keys/:key/reset', requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const result = await licenseCollection.updateOne({ key }, { $set: { used: false } });
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Key not found' });
        res.json({ message: 'Key reset' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin — revoke a license key
app.delete('/admin/keys/:key', requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const result = await licenseCollection.deleteOne({ key });
        if (result.deletedCount === 0) return res.status(404).json({ error: 'Key not found' });
        res.json({ message: 'Key revoked' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// WebSocket
wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify(srData));
    ws.on('close', () => clients.delete(ws));
});

function updateSRData(newData) {
    srData = { ...srData, ...newData };
    clients.forEach(client => {
        client.send(JSON.stringify({
            rank: srData.rank,
            currentSR: srData.currentSR ?? 0,
            dailySR: srData.dailySR ?? 0,
            rankImage: srData.rankImage || ''
        }));
    });
}

server.listen(3000, async () => {
    await connectToDB();
    console.log('Server is running on port 3000');
});
