# VaporMic 🎙️🔥

> **Ephemeral, Self-Destructing Voice Notes**  
> Speak freely. Once the recipient finishes listening to the note, it vanishes permanently from existence.

---

## ✨ Features

- **One-Time Listen (Burn-on-Read):** Immediately after playback completes, the audio file is deleted from disk and the database record is purged.
- **24-Hour Native TTL:** Unlistened voice notes automatically expire after 24 hours via MongoDB's native TTL index (`expires: 86400`).
- **In-Browser Recording:** Seamless microphone recording with live audio visualizer waveform, timer, and preview playback.
- **One-Click Link Generation:** Generates a secure, 10-character `nanoid` link with 1-click clipboard copying.
- **Instant Incineration Option:** Recipients can manually burn the note immediately without listening.
- **Stealth Dark-Mode UI:** Built with Tailwind CSS and Lucide React icons with responsive glowing aesthetics.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Tailwind CSS v4, Lucide React icons, React Router DOM
- **Backend:** Node.js (ESM), Express.js, Mongoose, Multer, Nanoid, CORS, Dotenv
- **Database:** MongoDB (with TTL index on `createdAt`)

---

## 📁 Project Structure

```text
VaporMic/
├── client/                     # React Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── Header.jsx      # Top navigation and status indicators
│   │   ├── pages/
│   │   │   ├── Home.jsx        # Voice recorder, preview & link generator
│   │   │   └── Listen.jsx      # One-time player & burn-on-ended view
│   │   ├── App.jsx             # React router setup
│   │   ├── index.css           # Tailwind CSS directives & animations
│   │   └── main.jsx
│   ├── vite.config.js          # Vite config with /api proxy & Tailwind v4
│   └── package.json
├── server/                     # Node.js / Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # Mongoose connection
│   │   ├── controllers/
│   │   │   └── noteController.js # Audio upload, metadata, stream & destroy
│   │   ├── middleware/
│   │   │   └── upload.js       # Multer audio disk storage & validator
│   │   ├── models/
│   │   │   └── Note.js         # Note schema with 24h TTL index
│   │   ├── routes/
│   │   │   └── noteRoutes.js   # Note API routes
│   │   └── server.js           # Express app & CORS configuration
│   ├── uploads/                # Temporary audio file storage
│   ├── .env                    # Server environment variables
│   ├── .env.example
│   └── package.json
├── package.json                # Root package with concurrent run scripts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **MongoDB** running locally on default port `27017` (or provide `MONGODB_URI` in `server/.env`)

### 1. Install Dependencies

You can install all dependencies across root, server, and client with a single command:

```bash
npm run install:all
```

Or install individually:
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Configure Environment

The `server/.env` file is pre-configured for local development:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vapormic
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Run Development Servers

Run both the Express backend and React Vite frontend concurrently from the root workspace:

```bash
npm run dev
```

Or run them independently in separate terminal tabs:

```bash
# Terminal 1: Backend (http://localhost:5000)
npm run server

# Terminal 2: Frontend (http://localhost:5173)
npm run client
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/notes` | Uploads `.webm` voice note via Multer. Generates a 10-char `nanoid` ID and stores note. Returns `{ success: true, id, url }`. |
| `GET` | `/api/notes/:id` | Returns note metadata. Returns `404` if expired, destroyed, or listened. |
| `GET` | `/api/notes/:id/stream` | Streams raw audio with HTTP Range support and `Content-Type: audio/webm`. |
| `POST` | `/api/notes/:id/destroy` | Unlinks the file from `uploads/` and deletes the document from MongoDB. |
| `GET` | `/api/health` | Health check and uptime status. |

---

## 🛡️ Ephemeral Lifecycle

1. **Recording & Creation:** User records audio in browser. When finished, clicking "Create Secret Link" uploads the blob to `POST /api/notes`.
2. **Access & Verification:** The recipient opens `/listen/:id`. The frontend checks `GET /api/notes/:id`. If nonexistent or destroyed, the recipient sees the **"Message Burned or Expired"** view.
3. **Burn on Listen:** When playback ends (`onEnded` event), the frontend sends `POST /api/notes/:id/destroy`. The audio file is unlinked from disk and the document is removed from MongoDB.
4. **24-Hour Expiration:** If the link is never opened, MongoDB's background TTL worker automatically drops the document after 86,400 seconds (24 hours).

