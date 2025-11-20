# Community Maps Alert Application

A full-stack web application for reporting and viewing location-based community alerts using OpenStreetMap.

## Features

### Core Features
- Interactive map using OpenStreetMap (Leaflet.js)
- Add alerts by clicking on the map
- Multiple alert categories: Icicle, Street Dog, Pothole, Flooding, Construction, Accident, Other
- Filter alerts by category
- Upvote alerts to confirm reports
- Severity levels (low/medium/high)
- Auto-expiring alerts (7 days)

### Phase 2 Features
- User authentication (register/login)
- Comments on alerts
- Geolocation - find your current location
- Mobile-responsive design
- Alert detail view with full comments

### Phase 3 Features
- Photo upload for alerts
- Search alerts by description
- Nearby alerts notification
- User profile with statistics
- Delete own alerts
- Community statistics dashboard
- Top contributors leaderboard

## Tech Stack

- **Frontend**: React + TypeScript + Leaflet.js
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT-based authentication

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

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### User Profile
- `GET /api/users/:id/alerts` - Get user's alerts
- `GET /api/users/:id/stats` - Get user statistics

### Alerts
- `GET /api/alerts` - Get all alerts (supports ?category, ?search, ?lat&lng&radius)
- `GET /api/alerts/nearby` - Get nearby alerts (?lat, ?lng, ?radius)
- `GET /api/alerts/:id` - Get single alert with comments
- `POST /api/alerts` - Create alert with optional photo
- `POST /api/alerts/:id/upvote` - Upvote alert
- `DELETE /api/alerts/:id` - Delete own alert (requires auth)

### Comments
- `GET /api/alerts/:id/comments` - Get comments for alert
- `POST /api/alerts/:id/comments` - Add comment

### Statistics
- `GET /api/stats` - Get community statistics

### Categories
- `GET /api/categories` - Get all categories

## Alert Categories

| Category | Description |
|----------|-------------|
| Icicle Alert | Winter hazard warnings |
| Street Dog | Stray animal sightings |
| Pothole | Road damage |
| Flooding | Water hazards |
| Construction | Work zones |
| Accident | Traffic incidents |
| Other | General alerts |

## Database Schema

```sql
users:
  - id, username, email, password_hash, created_at

alerts:
  - id, user_id, latitude, longitude, category
  - description, severity, photo_url
  - created_at, expires_at, status, upvotes

comments:
  - id, alert_id, user_id, username, content, created_at
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - Secret for JWT signing (change in production)

## License

MIT
