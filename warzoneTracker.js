const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const ranks = [
    { name: 'Bronze', sr: 0, tiers: 3 },
    { name: 'Silver', sr: 900, tiers: 3 },
    { name: 'Gold', sr: 2100, tiers: 3 },
    { name: 'Platinum', sr: 3600, tiers: 3 },
    { name: 'Diamond', sr: 5400, tiers: 3 },
    { name: 'Crimson', sr: 7500, tiers: 3 },
    { name: 'Iridescent', sr: 10000, tiers: 1 },
    { name: 'Top 250', sr: 10000, tiers: 1 }
];

function getRank(sr) {
    for (let i = ranks.length - 1; i >= 0; i--) {
        if (sr >= ranks[i].sr) {
            let tier = Math.min(3, Math.ceil((sr - ranks[i].sr) / ((ranks[i + 1]?.sr || sr + 1) - ranks[i].sr) * 3));
            return ranks[i].tiers > 1 ? `${ranks[i].name} ${tier}` : ranks[i].name;
        }
    }
    return 'Unranked';
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/calculate', (req, res) => {
    const { startSR, currentSR } = req.body;
    const gainedSR = currentSR - startSR;
    const rank = getRank(currentSR);
    res.json({ gainedSR, rank });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
