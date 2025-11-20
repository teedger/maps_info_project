# Community Maps Alert Application

A web application for reporting and viewing location-based community alerts using OpenStreetMap.

## Features

- Interactive map using OpenStreetMap (Leaflet.js)
- Add alerts by clicking on the map
- Multiple alert categories: Icicle, Street Dog, Pothole, Flooding, etc.
- Filter alerts by category
- Upvote alerts to confirm reports
- Severity levels (low, medium, high)
- Auto-expiring alerts (7 days)

## Tech Stack

- **Frontend**: React + TypeScript + Leaflet.js
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)

## Getting Started

### Backend

```bash
cd backend
npm install
npm start
```

Server runs on http://localhost:3001

### Frontend

```bash
cd frontend
npm install
npm start
```

App runs on http://localhost:3000

## API Endpoints

- `GET /api/alerts` - Get all alerts (optional: ?category=icicle&status=active)
- `GET /api/alerts/:id` - Get single alert
- `POST /api/alerts` - Create alert
- `POST /api/alerts/:id/upvote` - Upvote alert
- `DELETE /api/alerts/:id` - Delete alert
- `GET /api/categories` - Get all categories

## Alert Categories

- Icicle Alert
- Street Dog
- Pothole
- Flooding
- Construction
- Accident
- Other
