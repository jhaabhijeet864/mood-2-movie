# Mood2Movie 🎬

A Node.js web application that recommends movies based on your current mood using Google's Gemini AI. Tell us how you feel, and we'll find the perfect movies for you!

## ✨ Features

- **Mood-Based Recommendations**: Enter your current mood and get personalized movie suggestions
- **AI-Powered**: Utilizes Google Gemini AI for intelligent recommendations
- **User Authentication**: Sign in with Google or GitHub using Firebase Auth
- **Search History**: Keep track of your previous mood searches (when signed in)
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Clean Interface**: Minimalist, elegant UI focused on user experience

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mood2movie.git
   cd mood2movie
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Gemini API key and Firebase configuration
   ```bash
   cp .env.example .env
   ```

4. **Configure Firebase** (optional for basic functionality)
   - Follow the detailed guide in `FIREBASE-SETUP.md`
   - Update `public/js/firebase-config.js` with your Firebase config

5. **Run the application**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

- `GEMINI_API_KEY`: Your Google Gemini API key (required)
- `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON for server-side auth (optional)
- `PORT`: Port number (default: 3000)

## 🛠️ Tech Stack

- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla JavaScript, EJS templating
- **Authentication**: Firebase Auth (Google & GitHub)
- **AI**: Google Gemini 2.5 Flash
- **Styling**: Custom CSS (no frameworks)
- **Deployment**: Vercel-ready configuration

## 📁 Project Structure

```
mood2movie/
├── public/
│   ├── css/
│   │   └── style.css          # Custom styles
│   └── js/
│       ├── script.js          # Client-side logic
│       └── firebase-config.js # Firebase configuration
├── src/
│   └── index.js               # Main Express application
├── views/
│   └── index.ejs              # Main HTML template
├── FIREBASE-SETUP.md          # Firebase setup guide
├── package.json
├── vercel.json                # Vercel deployment config
└── README.md
```

## 🔐 Firebase Authentication Setup

For user authentication and search history features:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Google and/or GitHub providers
3. Generate a service account key for server-side verification
4. Follow the detailed instructions in `FIREBASE-SETUP.md`

**Note**: The app works without Firebase - you'll just miss out on user profiles and search history.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `GEMINI_API_KEY`
   - `FIREBASE_SERVICE_ACCOUNT` (if using Firebase)
4. Deploy!

The `vercel.json` file is already configured for optimal deployment.

### Other Platforms

The app can be deployed on any Node.js hosting platform:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS Elastic Beanstalk

## 🎯 Usage

1. **Without Sign-in**: Simply enter your mood and get movie recommendations
2. **With Sign-in**: 
   - Sign in with Google or GitHub
   - Get personalized recommendations
   - Access your search history
   - Enjoy a more tailored experience

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for intelligent movie recommendations
- Firebase for authentication and data storage
- The movie database community for inspiration

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the `FIREBASE-SETUP.md` for authentication troubleshooting

---

Made with ❤️ using Node.js and Google Gemini AI
