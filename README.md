# Warzone Rank Tracker

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![WebSockets](https://img.shields.io/badge/WebSockets-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Render](https://img.shields.io/badge/Deployed%20on%20Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

🔴 **[View Live Project](https://warzonesrtracker.onrender.com)**

---

A real-time SR (Skill Rating) overlay system for Call of Duty: Warzone streamers. Designed to be dropped directly into OBS as a browser source, displaying the streamer's current rank badge, SR, and daily SR gain/loss , updating live as they play.

## What It Does

Streamers are given a URL. They add it to OBS as a transparent browser source and it just works. As they update their SR between games, the overlay reflects their current rank and progress in real time , no page refresh, no manual image swapping.

The system automatically determines the correct rank tier and badge image based on the submitted SR value, covering the full ranked ladder from Bronze 1 through to Iridescent.

Daily SR is colour-coded green for gains and red for losses, giving viewers an at-a-glance read of how the session is going.

## How It Works

SR updates are submitted via a separate input page. The server validates the request, calculates the correct rank, persists the state to the database, and broadcasts the update to all connected overlay clients simultaneously over WebSocket. The overlay reacts instantly without any polling or page reloads.

If the server restarts, SR state is restored from the database so the overlay picks up exactly where it left off.

```
Streamer submits SR ──► Server validates & calculates rank
                              │
                        Persists to MongoDB
                              │
                     Broadcasts via WebSocket
                              │
                       Overlay updates live
```

## Demo

A permanent demo key is available to try the input form: `LICENSE-KEY-12345`

## Access Control

Each streamer is issued a one-time license key. They enter it once on the input page and it is stored locally in their browser , they never need to enter it again. Keys can be revoked or reset remotely at any time via the admin panel without any code changes or redeployment.

## Tech Stack

| | |
|---|---|
| Runtime | Node.js (ES Modules) |
| Server | Express.js |
| Real-time | WebSockets (`ws`) |
| Database | MongoDB Atlas |
| Frontend | Vanilla HTML / CSS / JS |
| Hosting | Render |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Live overlay page |
| `GET` | `/input.html` | SR submission form |
| `GET` | `/admin.html` | License key management panel |
| `GET` | `/health` | Server and database health check |
| `GET` | `/sr-data` | Current SR state |
| `POST` | `/update-sr` | Submit a new SR value |
| `POST` | `/validate-license` | Activate a license key |
| `GET` | `/admin/keys` | List all license keys |
| `POST` | `/admin/generate-key` | Generate a new license key |
| `PATCH` | `/admin/keys/:key/reset` | Reset a used key |
| `DELETE` | `/admin/keys/:key` | Revoke a license key |

## Security

- License key validation is protected against NoSQL injection
- The SR update endpoint requires a valid activated license key on every request
- License validation is rate limited to prevent brute force attempts
- CORS is restricted to the configured origin
- Admin endpoints are protected by a separate password and never exposed to streamers
