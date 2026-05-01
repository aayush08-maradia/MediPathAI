const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Use environment variable (Production/Render)
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Use local file (Development)
    serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
  
  console.log('✓ Firebase Admin SDK initialized');
} catch (error) {
  console.error('Firebase initialization error:', error.message);
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('Make sure serviceAccountKey.json exists in backend folder or FIREBASE_SERVICE_ACCOUNT env var is set');
  }
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
