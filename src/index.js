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
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// CORS middleware for production deployment
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://movie-2-movie-4241d.web.app',
    'https://movie-2-movie-4241d.firebaseapp.com',
    'https://mood-2-movie-804l5uzye-abhijeet-jhas-projects.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/profile', (req, res) => {
  res.render('profile');
});

app.post('/recommend', verifyFirebaseToken, async (req, res) => {
  const mood = req.body.mood?.trim();
  
  if (!mood) {
    return res.status(400).json({ error: 'Empty mood' });
  }

  try {
    // Prepare detailed prompt for Gemini
    let prompt = `Suggest 3-5 movies for someone who feels "${mood}". For each movie, provide:
    - title: The movie title
    - year: Release year
    - genre: Primary genre (e.g., Drama, Comedy, Action, etc.)
    - rating: IMDb rating if known (e.g., "8.1") or null if unknown
    - reason: A detailed explanation (2-3 sentences) of why this movie matches their mood and what makes it perfect for this emotional state.
    
    Return as JSON array with exactly these fields: title, year, genre, rating, reason.
    Focus on well-known, critically acclaimed movies that genuinely match the emotional state.`;
    
    // Personalize if user is authenticated
    if (req.user) {
      prompt += ` The user is a returning viewer who appreciates thoughtful recommendations.`;
    }
    
    // Generate recommendations
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();
    
    // Clean up the response - remove backticks and any markdown code fencing
    const cleanText = text.replace(/```(json)?|```/g, '').trim();
    
    // Parse JSON
    let movies;
    try {
      movies = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', cleanText);
      throw new Error('Invalid response format from AI');
    }
    
    // Validate and clean the response
    if (!Array.isArray(movies)) {
      throw new Error('Expected array of movies');
    }
    
    // Ensure all required fields are present and properly formatted
    movies = movies.map((movie, index) => {
      if (!movie.title || !movie.year || !movie.reason) {
        console.warn(`Movie ${index} missing required fields:`, movie);
        return null;
      }
      
      return {
        title: String(movie.title).trim(),
        year: String(movie.year).trim(),
        genre: movie.genre ? String(movie.genre).trim() : 'Drama',
        rating: movie.rating && movie.rating !== 'null' ? String(movie.rating).trim() : null,
        reason: String(movie.reason).trim()
      };
    }).filter(movie => movie !== null); // Remove invalid entries
    
    if (movies.length === 0) {
      throw new Error('No valid movies returned');
    }
    
    // Store user's search in database with movie details (optional enhancement)
    if (req.user && firebaseInitialized) {
      try {
        await admin.firestore().collection('searches').add({
          userId: req.user.uid,
          mood: mood,
          movies: movies,
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
    
    // Return a more specific error message
    let errorMessage = 'Failed to get recommendations';
    if (error.message.includes('Invalid response format')) {
      errorMessage = 'AI returned invalid response format';
    } else if (error.message.includes('No valid movies')) {
      errorMessage = 'No valid movie recommendations could be generated';
    } else if (error.message.includes('API')) {
      errorMessage = 'AI service temporarily unavailable';
    }
    
    return res.status(500).json({ error: errorMessage });
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
      const data = doc.data();
      searches.push({
        id: doc.id,
        mood: data.mood,
        movies: data.movies || [], // Include movies array
        timestamp: data.timestamp?.toDate() || new Date()
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


