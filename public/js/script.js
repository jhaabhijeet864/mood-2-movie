// Client-side JavaScript with Firebase Authentication and Modern UI
import { firebaseConfig } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const moodInput = document.getElementById('mood');
  const moodForm = document.getElementById('mood-form');
  const submitButton = document.getElementById('go');
  const btnText = submitButton.querySelector('.btn-text');
  const loadingSpinner = submitButton.querySelector('.loading-spinner');
  const movieResults = document.getElementById('movie-results');
  
  // Auth elements
  const authSection = document.getElementById('auth-section');
  const loginCard = document.getElementById('login-card');
  const userProfileCard = document.getElementById('user-profile-card');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const logoutButton = document.getElementById('logout-button');
  const loginGoogleBtn = document.getElementById('login-google');
  const loginGithubBtn = document.getElementById('login-github');
  
  // Layout elements
  const mainGrid = document.getElementById('main-grid');
  const disabledState = document.getElementById('disabled-state');
  const userProfileSidebar = document.getElementById('user-profile-sidebar');
  
  // State
  let currentUser = null;
  let searchHistory = [];
  let isSearching = false;
  
  // Mock user data for development
  const mockUser = {
    displayName: "John Doe",
    email: "john.doe@example.com",
    photoURL: null,
    uid: "mock-user-123"
  };
  
  // Update the API endpoints to use Vercel
  const API_BASE_URL = 'https://mood-2-movie-804l5uzye-abhijeet-jhas-projects.vercel.app';
  
  // Initialize the app
  init();
  
  function init() {
    setupEventListeners();
    initializeFirebase();
    setupMoodSuggestions();
    updateUIForSignedOutUser(); // Start with signed out state
  }
  
  function setupEventListeners() {
    // Form submission
    moodForm.addEventListener('submit', handleMoodSubmit);
    
    // Logout
    if (logoutButton) {
      logoutButton.addEventListener('click', handleLogout);
    }
  }
  
  function setupMoodSuggestions() {
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');
    suggestionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.getAttribute('data-mood');
        moodInput.value = mood;
      });
    });
  }
  
  async function handleMoodSubmit(e) {
    e.preventDefault();
    
    if (isSearching) return;
    
    const mood = moodInput.value.trim();
    if (!mood) {
      alert('Please enter your mood');
      return;
    }
    
    // Start loading state
    setLoadingState(true);
    
    try {
      // Add user ID to the request if logged in
      const requestBody = { mood };
      
      // Use VERCEL backend URL instead of Firebase Functions
      const apiUrl = `${API_BASE_URL}/recommend`;
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add auth token if user is signed in
      if (currentUser && window.firebase && firebase.auth) {
        try {
          const idToken = await firebase.auth().currentUser.getIdToken();
          headers.Authorization = `Bearer ${idToken}`;
        } catch (tokenError) {
          console.warn('Could not get auth token:', tokenError);
        }
      }
      
      // Send request to Vercel backend
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      // Parse response
      const data = await response.json();
      
      // Handle error
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get recommendations');
      }
      
      // Display results
      displayMovieResults(data, mood);
      
      // Add to search history if user is logged in
      if (currentUser && Array.isArray(data) && data.length > 0) {
        addToSearchHistory(mood, data);
      }
      
    } catch (error) {
      console.error('Error:', error);
      displayError(error.message);
    } finally {
      // Reset loading state after a delay to prevent rapid requests
      setTimeout(() => {
        setLoadingState(false);
      }, 2000);
    }
  }
  
  function setLoadingState(loading) {
    isSearching = loading;
    
    if (loading) {
      // Show loading state
      btnText.style.display = 'none';
      loadingSpinner.style.display = 'flex';
      submitButton.disabled = true;
      
      // Show loading skeleton
      showLoadingSkeleton();
    } else {
      // Hide loading state
      btnText.style.display = 'block';
      loadingSpinner.style.display = 'none';
      submitButton.disabled = false;
    }
  }
  
  function showLoadingSkeleton() {
    movieResults.innerHTML = `
      <div class="loading-container">
        <div class="loading-header">
          <div class="loading-main-spinner"></div>
          <p class="loading-text">Finding perfect movies for your mood...</p>
        </div>
        ${Array.from({length: 3}, (_, i) => `
          <div class="skeleton-card">
            <div class="skeleton-title"></div>
            <div class="skeleton-meta"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  function displayMovieResults(movies, mood) {
    if (!Array.isArray(movies) || movies.length === 0) {
      movieResults.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎬</div>
          <h3 class="empty-title">No movies found</h3>
          <p class="empty-description">
            Try describing your mood differently to get better recommendations
          </p>
        </div>
      `;
      return;
    }
    
    const resultsHeader = `
      <div class="results-header">
        <h3 class="results-title">
          Movies for when you're feeling <span style="color: var(--indigo-600)">${mood}</span>
        </h3>
        <p class="results-subtitle">${movies.length} personalized recommendations</p>
      </div>
    `;
    
    const moviesHtml = movies.map((movie, index) => `
      <div class="movie-card" style="animation-delay: ${index * 150}ms">
        <div class="movie-header">
          <div class="movie-title-section">
            <h4 class="movie-title">${movie.title}</h4>
            <div class="movie-meta">
              <div class="movie-year">
                <i data-lucide="calendar" style="width: 1rem; height: 1rem;"></i>
                <span>${movie.year}</span>
              </div>
              ${movie.rating ? `
                <div class="movie-rating">
                  <i data-lucide="star" style="width: 1rem; height: 1rem; fill: currentColor;"></i>
                  <span>${movie.rating}</span>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="movie-genre">${movie.genre || 'Drama'}</div>
        </div>
        <p class="movie-description">${movie.reason}</p>
      </div>
    `).join('');
    
    movieResults.innerHTML = `
      ${resultsHeader}
      <div class="results-grid">
        ${moviesHtml}
      </div>
    `;
    
    // Reinitialize Lucide icons for the new content
    if (window.lucide) {
      lucide.createIcons();
    }
  }
  
  function displayError(message) {
    movieResults.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h3 class="empty-title">Error</h3>
        <p class="empty-description">${message}</p>
      </div>
    `;
  }
  
  function addToSearchHistory(mood, movies) {
    const historyItem = {
      mood,
      movies: movies.map(m => ({
        title: m.title,
        year: m.year,
        description: m.reason,
        genre: m.genre || 'Drama',
        rating: m.rating
      })),
      timestamp: new Date()
    };
    
    searchHistory.unshift(historyItem);
    searchHistory = searchHistory.slice(0, 10); // Keep only last 10 searches
    
    updateUserProfileSidebar();
  }
  
  function handleHistoryClick(historyItem) {
    moodInput.value = historyItem.mood;
    displayMovieResults(historyItem.movies, historyItem.mood);
  }
  
  function formatDate(date) {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  }
  
  function updateUserProfileSidebar() {
    if (!currentUser) return;
    
    const totalMovies = searchHistory.reduce((acc, item) => acc + item.movies.length, 0);
    
    const profileCardHtml = `
      <div class="profile-card">
        <div class="profile-header">
          <img class="profile-avatar" src="${currentUser.photoURL || '/placeholder-avatar.png'}" alt="Profile" onerror="this.style.display='none'">
          <h3 class="profile-name">${currentUser.displayName || 'Movie Enthusiast'}</h3>
          <p class="profile-email">${currentUser.email}</p>
        </div>
        <div class="profile-stats">
          <div>
            <span class="stat-value">${searchHistory.length}</span>
            <span class="stat-label">Searches</span>
          </div>
          <div>
            <span class="stat-value">${totalMovies}</span>
            <span class="stat-label">Movies Found</span>
          </div>
        </div>
      </div>
    `;
    
    const historyCardHtml = searchHistory.length > 0 ? `
      <div class="history-card">
        <div class="history-header">
          <i data-lucide="clock" style="width: 1.25rem; height: 1.25rem;"></i>
          <h3 class="history-title">Recent Searches</h3>
        </div>
        <div class="history-list">
          ${searchHistory.slice(0, 5).map((item, index) => `
            <div class="history-item" data-history-index="${index}">
              <div class="history-item-header">
                <div class="history-mood">${item.mood}</div>
                <span class="history-time">${formatDate(item.timestamp)}</span>
              </div>
              <div class="history-movies">
                <i data-lucide="film" style="width: 1rem; height: 1rem;"></i>
                <span>${item.movies.length} movies</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : `
      <div class="history-card">
        <div class="empty-history">
          <i data-lucide="film" class="empty-history-icon"></i>
          <p>Your search history will appear here</p>
        </div>
      </div>
    `;
    
    userProfileSidebar.innerHTML = profileCardHtml + historyCardHtml;
    
    // Add click handlers for history items
    const historyItems = userProfileSidebar.querySelectorAll('.history-item');
    historyItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        handleHistoryClick(searchHistory[index]);
      });
    });
    
    // Reinitialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }
  
  // Initialize Firebase
  function initializeFirebase() {
    // Check if Firebase config is available
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      console.log('Firebase not configured, using mock authentication');
      setupMockAuth();
      return;
    }
    
    // Load Firebase SDK
    const script1 = document.createElement('script');
    script1.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
    document.head.appendChild(script1);
    
    const script2 = document.createElement('script');
    script2.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
    script2.onload = setupFirebaseAuth;
    document.head.appendChild(script2);
  }
  
  function setupMockAuth() {
    // Set up mock authentication for development
    loginGoogleBtn?.addEventListener('click', () => {
      setTimeout(() => {
        currentUser = mockUser;
        updateUIForSignedInUser(mockUser);
      }, 1000);
    });
    
    loginGithubBtn?.addEventListener('click', () => {
      setTimeout(() => {
        currentUser = mockUser;
        updateUIForSignedInUser(mockUser);
      }, 1000);
    });
  }
  
  // Set up Firebase Auth
  function setupFirebaseAuth() {
    try {
      // Initialize Firebase
      firebase.initializeApp(firebaseConfig);
      
      // Set up auth providers with additional scopes
      const googleProvider = new firebase.auth.GoogleAuthProvider();
      googleProvider.addScope('email');
      googleProvider.addScope('profile');
      
      const githubProvider = new firebase.auth.GithubAuthProvider();
      githubProvider.addScope('user:email');
      
      // Auth state change listener
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          currentUser = user;
          updateUIForSignedInUser(user);
          console.log('User signed in:', user.displayName || user.email);
        } else {
          currentUser = null;
          updateUIForSignedOutUser();
          console.log('User signed out');
        }
      });
      
      // Add login event listeners with improved UX
      loginGoogleBtn?.addEventListener('click', async () => {
        try {
          // Show loading state
          loginGoogleBtn.disabled = true;
          loginGoogleBtn.innerHTML = '<div class="spinner" style="width: 1rem; height: 1rem; margin-right: 0.5rem;"></div>Signing in...';
          
          const result = await firebase.auth().signInWithPopup(googleProvider);
          console.log('Google login successful:', result.user.displayName);
        } catch (error) {
          console.error('Google login error:', error);
          
          // Handle specific error cases
          let errorMessage = 'Google login failed';
          if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login cancelled by user';
          } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Popup blocked. Please allow popups for this site';
          } else {
            errorMessage = `Google login failed: ${error.message}`;
          }
          
          alert(errorMessage);
        } finally {
          // Reset button state
          loginGoogleBtn.disabled = false;
          loginGoogleBtn.innerHTML = `
            <svg class="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          `;
        }
      });
      
      loginGithubBtn?.addEventListener('click', async () => {
        try {
          // Show loading state
          loginGithubBtn.disabled = true;
          loginGithubBtn.innerHTML = '<div class="spinner" style="width: 1rem; height: 1rem; margin-right: 0.5rem;"></div>Signing in...';
          
          const result = await firebase.auth().signInWithPopup(githubProvider);
          console.log('GitHub login successful:', result.user.displayName || result.user.email);
        } catch (error) {
          console.error('GitHub login error:', error);
          
          // Handle specific error cases
          let errorMessage = 'GitHub login failed';
          if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login cancelled by user';
          } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Popup blocked. Please allow popups for this site';
          } else if (error.code === 'auth/account-exists-with-different-credential') {
            errorMessage = 'An account with this email already exists with a different login method';
          } else {
            errorMessage = `GitHub login failed: ${error.message}`;
          }
          
          alert(errorMessage);
        } finally {
          // Reset button state
          loginGithubBtn.disabled = false;
          loginGithubBtn.innerHTML = `
            <i data-lucide="github"></i>
            Continue with GitHub
          `;
          // Reinitialize Lucide icons for the button
          if (window.lucide) {
            lucide.createIcons();
          }
        }
      });
      
    } catch (error) {
      console.error('Firebase initialization error:', error);
      console.log('Falling back to mock authentication');
      setupMockAuth();
    }
  }
  
  function handleLogout() {
    if (window.firebase && firebase.auth) {
      firebase.auth().signOut().catch(error => {
        console.error('Logout error:', error);
      });
    } else {
      // Mock logout
      currentUser = null;
      updateUIForSignedOutUser();
    }
  }
  
  // Update UI for signed-in users
  function updateUIForSignedInUser(user) {
    currentUser = user;
    
    // Hide login card, show user profile card
    if (loginCard) loginCard.style.display = 'none';
    if (userProfileCard) {
      userProfileCard.style.display = 'flex';
      
      // Update user info
      if (userName) userName.textContent = user.displayName || 'User';
      if (userEmail) userEmail.textContent = user.email || '';
      if (userAvatar) {
        userAvatar.src = user.photoURL || '/placeholder-avatar.png';
        userAvatar.onerror = () => {
          userAvatar.src = `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <rect width="40" height="40" fill="#e2e8f0"/>
              <text x="20" y="25" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#64748b">
                ${(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </text>
            </svg>
          `)}`;
        };
      }
    }
    
    // Show main content, hide disabled state
    if (mainGrid) mainGrid.style.display = 'grid';
    if (disabledState) disabledState.style.display = 'none';
    
    // Update sidebar
    updateUserProfileSidebar();
  }
  
  // Update UI for signed-out users
  function updateUIForSignedOutUser() {
    currentUser = null;
    searchHistory = [];
    
    // Show login card, hide user profile card
    if (loginCard) loginCard.style.display = 'block';
    if (userProfileCard) userProfileCard.style.display = 'none';
    
    // Hide main content, show disabled state
    if (mainGrid) mainGrid.style.display = 'none';
    if (disabledState) disabledState.style.display = 'block';
    
    // Clear results
    if (movieResults) {
      movieResults.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎬</div>
          <h3 class="empty-title">No movies found yet</h3>
          <p class="empty-description">
            Describe your mood above to get personalized movie recommendations
          </p>
        </div>
      `;
    }
  }
  
  // Update the recommendation function
  async function getRecommendations(mood) {
    try {
      showLoading(true);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add auth token if user is signed in
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/recommend`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ mood })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const movies = await response.json();
      displayRecommendations(movies);
      
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to get recommendations. Please try again.');
    } finally {
      showLoading(false);
    }
  }
  
  // Update the history function
  async function loadSearchHistory() {
    if (!currentUser) return;
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const searches = await response.json();
      displaySearchHistory(searches);
      
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }
});
