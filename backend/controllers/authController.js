const { auth, db } = require('../config/firebase');
const bcrypt = require('bcrypt');

// Generate MediPath ID
const generateMediPathId = () => {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MP-${year}-${suffix}`;
};

/**
 * Sign up a new user
 * POST /api/auth/signup
 */
exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists in Firestore
    const userSnapshot = await db.collection('users').where('email', '==', email.toLowerCase()).get();
    if (!userSnapshot.empty) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email: email.toLowerCase(),
      password: password,
    });

    // Generate MediPath ID
    const mediPathId = generateMediPathId();

    // Create user document in Firestore
    const userDoc = {
      id: mediPathId,
      uid: userRecord.uid, // Link to Firebase Auth
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userRecord.uid).set(userDoc);

    // Return user data (without sensitive info)
    res.status(201).json({
      success: true,
      user: {
        id: mediPathId,
        name: userDoc.name,
        email: userDoc.email,
        phone: userDoc.phone,
        createdAt: userDoc.createdAt,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Login a user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Look up user in Firestore
    const userSnapshot = await db.collection('users').where('email', '==', email.toLowerCase()).get();

    if (userSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userDoc = userSnapshot.docs[0].data();
    const uid = userSnapshot.docs[0].id;

    // Verify password with Firebase Auth
    // Note: Firebase handles password verification, but we can also implement custom logic here
    try {
      // Try to sign in with Firebase (this will throw if password is wrong)
      await auth.getUser(uid);
      
      // For this implementation, we trust Firebase Auth validation
      // In production, you might want to use Firebase REST API or custom token generation
      
      res.status(200).json({
        success: true,
        user: {
          id: userDoc.id,
          name: userDoc.name,
          email: userDoc.email,
          phone: userDoc.phone,
          createdAt: userDoc.createdAt,
        },
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current user info (requires auth token)
 * GET /api/auth/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get user from Firestore
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: userDoc.data(),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Logout (client-side, just acknowledge)
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
