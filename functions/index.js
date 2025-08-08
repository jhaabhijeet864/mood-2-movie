/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Prefer Functions config, fallback to env vars for local/emulator
const GEMINI_API_KEY =
  (functions.config().gemini && functions.config().gemini.api_key) ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Gemini API key not configured. Set with: firebase functions:config:set gemini.api_key="..."');
  throw new Error('Gemini API key not configured');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// CORS helper function
const cors = require('cors')({
  origin: [
    'http://localhost:3000',
    'https://movie-2-movie-4241d.web.app',
    'https://movie-2-movie-4241d.firebaseapp.com'
  ],
  credentials: true
});

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Cloud Function for movie recommendations
exports.recommend = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  const mood = req.body && req.body.mood ? String(req.body.mood).trim() : '';
    
    if (!mood) {
      return res.status(400).json({ error: 'Empty mood' });
    }

    try {
      // Verify user authentication if token is provided
      let user = null;
      if (req.headers.authorization) {
        try {
          const idToken = req.headers.authorization.split('Bearer ')[1];
          user = await admin.auth().verifyIdToken(idToken);
        } catch (authError) {
          console.warn('Auth verification failed:', authError.message);
          // Continue without user context
        }
      }

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
      if (user) {
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
      
      // Store user's search in Firestore if authenticated
      if (user) {
        try {
          await admin.firestore().collection('searches').add({
            userId: user.uid,
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
});

// Cloud Function for user search history
exports.history = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify user authentication
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const idToken = req.headers.authorization.split('Bearer ')[1];
      const user = await admin.auth().verifyIdToken(idToken);
      
      const snapshot = await admin.firestore()
        .collection('searches')
        .where('userId', '==', user.uid)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      
      const searches = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        searches.push({
          id: doc.id,
          mood: data.mood,
          movies: data.movies || [],
          timestamp: (data.timestamp && typeof data.timestamp.toDate === 'function')
            ? data.timestamp.toDate()
            : new Date()
        });
      });
      
      return res.json(searches);
    } catch (error) {
      console.error('Error fetching history:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
  });
});
