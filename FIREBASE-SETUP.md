# Firebase Authentication Setup

This guide explains how to set up Firebase Authentication for your Mood2Movie application.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter a project name (e.g., "mood2movie")
4. Follow the setup wizard (you can disable Google Analytics if not needed)
5. Click "Create Project"

## Step 2: Register Your Web App

1. From the project overview page, click the web icon (</>) 
2. Register your app with a nickname (e.g., "mood2movie-web")
3. Check "Also set up Firebase Hosting" if you want (optional)
4. Click "Register app"
5. Copy the Firebase configuration object that looks like:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. Paste this configuration into `public/js/firebase-config.js`, replacing the placeholder values

## Step 3: Enable Authentication Methods

1. In Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started" if it's your first time
3. Click on "Google" provider
4. Enable it and fill in your app name and email
5. Click "Save"
6. Repeat for GitHub provider if you want to use it:
   - You'll need to register your app on GitHub first
   - Get Client ID and Client Secret from GitHub
   - Add these to Firebase configuration

## Step 4: Generate Service Account Key (for Server-Side Verification)

1. In Firebase Console, go to "Project settings" (gear icon)
2. Go to "Service accounts" tab
3. Click "Generate new private key" button
4. Save the JSON file securely
5. You'll need this for server-side verification of tokens

## Step 5: Update Environment Variables

### For Local Development:

Create a `.env` file with:

```
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...} 
```

The `FIREBASE_SERVICE_ACCOUNT` should be the entire JSON from your service account key file, converted to a single line.

### For Vercel Deployment:

1. Add these same environment variables in Vercel:
   - Go to your project in Vercel dashboard
   - Go to Settings → Environment Variables
   - Add `GEMINI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT`

## Step 6: Deploy to Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will detect your Node.js application
4. Add environment variables as described above
5. Deploy your application

## Testing Firebase Authentication

1. Open your deployed application
2. Try signing in with Google or GitHub
3. Once signed in, your name and profile picture should appear
4. Your mood searches will be stored with your user ID if you're signed in

## Troubleshooting

- **Firebase JS SDK errors**: Make sure you've correctly copied the Firebase config
- **Authentication fails**: Check that you've enabled the auth providers in Firebase console
- **Server-side verification fails**: Verify the service account JSON is correctly formatted

## Security Best Practices

1. Never commit your `.env` file or service account keys to GitHub
2. Use environment variables for all secrets
3. Set up Firebase Security Rules to protect user data
4. Consider adding email verification for additional security
