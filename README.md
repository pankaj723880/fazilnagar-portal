# Fazilnagar News

A local news website for **Fazilnagar, Kushinagar, Uttar Pradesh (274401)** — built on the MERN stack (MongoDB, Express, React, Node).

## Features
- Live news slider on the homepage (auto-rotating featured story + scrolling breaking-news ticker), auto-refreshes every 30s
- "Upload News" form where anyone can post a story, picking their **location from a dropdown of Fazilnagar + nearby areas** (Pipra Rajab, Sultanpur, Padrauna, Kasia/Kushinagar, Khadda, Hata, Kaptanganj, Tamkuhi Raj, Deoria, etc.)
- Every news post supports an **image upload and a video upload**
- Filter all news by location and category
- Article detail page with view counter

## Project structure
```
fazilnagar-news/
  server/     Express + MongoDB API (multer handles image/video uploads)
  client/     React (Vite) frontend, styled with Tailwind (via CDN)
```

## 1. Backend setup
```bash
cd server
npm install
cp .env.example .env
# edit .env if your MongoDB URI is different (Atlas or local)
npm run dev        # starts on http://localhost:5000
```
You need MongoDB running locally, or a free MongoDB Atlas connection string in `MONGO_URI`.

## 2. Frontend setup
```bash
cd client
npm install
cp .env.example .env
npm run dev         # starts on http://localhost:5173
```
Open http://localhost:5173 in your browser.

## 3. Add / edit the nearby-areas list
Edit `server/data/locations.js` — add, remove, or rename any village/town so the dropdown matches exactly what you want residents to select from.

## 4. Deploying
- **Backend**: Render, Railway, or a VPS. Set `MONGO_URI` (e.g. MongoDB Atlas) and `CLIENT_URL` as environment variables.
- **Frontend**: Vercel or Netlify. Set `VITE_API_URL` to your deployed backend URL, then `npm run build`.
- Uploaded images/videos are saved to `server/uploads/` and served at `/uploads/<filename>`. For production at scale, swap this for cloud storage (Cloudinary / S3) — the `multer` middleware in `server/middleware/upload.js` is the only place you'd need to change.

## Notes
- Max upload size is capped at 100MB per file (image + video) — adjust `limits.fileSize` in `server/middleware/upload.js` if needed.
- News marked `isLive: true` (default) appears in the homepage slider; you can build an admin toggle later to retire old stories from the "live" feed without deleting them.
