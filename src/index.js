// Main Express application file with Firebase Authentication
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK (for server-side verification)
// You'll need to add the FIREBASE_SERVICE_ACCOUNT environment variable
// or provide the path to your service account key file
let firebaseInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the service account JSON from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    console.warn('Firebase service account not provided. Authentication verification disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Optional middleware to verify Firebase auth tokens
const verifyFirebaseToken = async (req, res, next) => {
  if (!firebaseInitialized) {
    return next(); // Skip verification if Firebase isn't initialized
  }
  
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  
  if (!idToken) {
    return next(); // No token provided, continue as unauthenticated
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Add user info to request
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    next(); // Continue as unauthenticated on error
  }
};

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.post('/recommend', verifyFirebaseToken, async (req, res) => {
  const mood = req.body.mood?.trim();
  
  if (!mood) {
    return res.status(400).json({ error: 'Empty mood' });
  }

  try {
    // Prepare prompt for Gemini
    let prompt = `Suggest 10 movies for someone who feels ${mood}.`;
    
    // Personalize if user is authenticated
    if (req.user) {
      prompt += ` The user's name is ${req.user.name || 'a returning user'}. `;
    }
    
    prompt += " Return JSON array; each item has title, year, reason.";
    
    // Generate recommendations
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();
    
    // Clean up the response - remove backticks and any markdown code fencing
    const cleanText = text.replace(/```(json)?|```/g, '').trim();
    
    // Parse JSON
    const movies = JSON.parse(cleanText);
    
    // Store user's search in database (optional enhancement)
    if (req.user && firebaseInitialized) {
      try {
        await admin.firestore().collection('searches').add({
          userId: req.user.uid,
          mood: mood,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (dbError) {
        console.error('Error storing search:', dbError);
        // Non-critical error, continue serving recommendations
      }
    }
    
    return res.json(movies);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get user's search history (protected route)
app.get('/api/history', verifyFirebaseToken, async (req, res) => {
  if (!req.user || !firebaseInitialized) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const snapshot = await admin.firestore()
      .collection('searches')
      .where('userId', '==', req.user.uid)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    const searches = [];
    snapshot.forEach(doc => {
      searches.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      });
    });
    
    return res.json(searches);
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
