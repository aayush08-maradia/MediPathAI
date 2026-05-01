# MediPath AI

MediPath AI is a healthcare navigator for India. It helps users describe symptoms in plain English or Hindi, maps them to a likely medical condition, estimates treatment costs, and shows nearby hospitals with relevant specialties.

This repository is organized as a monorepo:

- `backend/` - Express API, Firebase Admin integration, hospital search, NLP mapping, cost estimation, ranking, and confidence scoring
- `frontend/healthpath-ai-main/` - React + TypeScript + Vite frontend with authentication, search, filters, and results UI
- Project docs - implementation notes, status reports, Firebase setup, testing guidance, and feature summaries

## What the app does

- Accepts symptom or procedure text from the user
- Maps the query to a medical condition and specialty
- Shows hospitals relevant to that specialty and location
- Estimates treatment cost ranges
- Calculates a confidence score for the recommendation
- Supports Firebase Authentication and Firestore for user accounts

## Repository structure

```text
Project/
  backend/
    config/
    controllers/
    data/
    middleware/
    models/
    routes/
    services/
    server.js
    package.json
    .env
    .env.production
    serviceAccountKey.json
  frontend/
    healthpath-ai-main/
      src/
      public/
      package.json
      vite.config.ts
      .env.local
      .env.example
  README.md
  API_DOCUMENTATION.md
  FIREBASE_SETUP.md
  H_SCORE_IMPLEMENTATION.md
  IMPLEMENTATION_ROADMAP.md
  IMPLEMENTATION_SUMMARY.md
  PHASE2_COMPLETION.md
  PROJECT_STATUS.md
  QUICK_STATUS.md
  TESTING_GUIDE.md
  WHATS_REMAINING.md
```

## Tech stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- React Router
- React Query
- Framer Motion
- Firebase Web SDK

### Backend

- Node.js
- Express.js
- Firebase Admin SDK
- Firestore
- Firebase Authentication
- Fuse.js
- dotenv

## Main features

### User authentication

- Email and password signup/login
- Firebase Auth for identity management
- Firestore for user profile storage

### Symptom intelligence

- NLP endpoint to map symptom text to a condition
- Specialty matching for hospital filtering
- Emergency detection support

### Hospital discovery

- Search hospitals by symptom, city, or specialization
- Filter by tier, rating, budget, and distance
- Show hospital details, procedures, and cost estimates

### Confidence scoring

- H-SCORE formula implementation
- Component-based confidence calculation
- Explainable breakdown for recommendations

## Getting started

### Prerequisites

- Node.js 18 or later
- npm
- A Firebase project with Firestore and Authentication enabled

### 1. Install dependencies

From the repository root:

```bash
cd backend
npm install

cd ../frontend/healthpath-ai-main
npm install
```

### 2. Configure the backend

The backend reads Firebase Admin credentials from `backend/serviceAccountKey.json` and environment variables from `backend/.env`.

Required environment values:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

Important:

- Keep `backend/serviceAccountKey.json` out of git
- Keep secrets out of committed `.env` files
- `backend/.env.production` is for deployment only

### 3. Configure the frontend

The frontend reads Firebase web config from `frontend/healthpath-ai-main/.env.local`.

Required environment values:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Start the app locally

Run the backend in one terminal:

```bash
cd backend
npm run dev
```

Run the frontend in another terminal:

```bash
cd frontend/healthpath-ai-main
npm run dev
```

The default local URLs are usually:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Firebase setup

This project uses Firebase for authentication and Firestore for user data.

### Firebase services used

- Firebase Authentication - login and signup
- Firestore - user profiles and app data
- Firebase Admin SDK - backend access to Firestore and Auth

### Required Firebase steps

1. Create a Firebase project
2. Enable Authentication with Email/Password
3. Create a Firestore database
4. Add the frontend web app config to `.env.local`
5. Download the service account key JSON and place it in `backend/serviceAccountKey.json`
6. Update Firestore security rules to allow authenticated access to each user profile

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for the full step-by-step setup.

## API overview

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Hospitals

- `GET /api/hospitals`
- `GET /api/hospitals/cities`
- `GET /api/hospitals/search`
- `GET /api/hospitals/:id`
- `POST /api/hospitals/filter`
- `GET /api/hospitals/city/:city`
- `GET /api/hospitals/specialization/:spec`

### Search

- `GET /api/search?q=term`

### NLP

- `POST /api/nlp/map-condition`
- `GET /api/nlp/condition/:conditionId`
- `GET /api/nlp/specialties`
- `GET /api/nlp/specialty/:specialty`
- `POST /api/nlp/validate-input`

### Cost

- `POST /api/cost/estimate`
- `POST /api/cost/compare`
- `GET /api/cost/breakdown/:conditionId`

### Ranking

- `POST /api/ranking/rank`
- `POST /api/ranking/compare`

### Confidence

- `POST /api/confidence/calculate`
- `POST /api/confidence/improve-suggestions`

## Deployment recommendation

For this stack, the simplest deployment path is:

- Frontend: Vercel
- Backend: Render
- Database/Auth: Firebase

Deployment flow:

1. Push the repository to GitHub
2. Deploy the frontend from `frontend/healthpath-ai-main`
3. Deploy the backend from `backend`
4. Set production environment variables in both services
5. Point `VITE_API_BASE_URL` to the deployed backend URL

## Notes

- The project is still a prototype/hackathon-style application, not a clinical system
- It should not be used for emergency medical decisions without professional review
- Do not commit secret files or private keys to git

## Troubleshooting

### Frontend does not start

- Check that `npm install` completed in `frontend/healthpath-ai-main`
- Make sure `.env.local` contains valid Firebase values
- Restart Vite after changing env files

### Backend does not start

- Check that `npm install` completed in `backend`
- Make sure `backend/serviceAccountKey.json` exists
- Verify `backend/.env` values are valid

### Firebase permission errors

- Check Firestore security rules
- Confirm the signed-in Firebase user has a matching Firestore profile
- Verify the frontend and backend are pointing to the same Firebase project

## License

No license has been declared in this repository.
