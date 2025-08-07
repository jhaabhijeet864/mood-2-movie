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
      if (currentUser) {
        requestBody.userId = currentUser.uid;
      }
      
      // Send request to server
      const response = await fetch('/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
      
      // Set up auth providers
      const googleProvider = new firebase.auth.GoogleAuthProvider();
      const githubProvider = new firebase.auth.GithubAuthProvider();
      
      // Auth state change listener
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          currentUser = user;
          updateUIForSignedInUser(user);
        } else {
          currentUser = null;
          updateUIForSignedOutUser();
        }
      });
      
      // Add login event listeners
      loginGoogleBtn?.addEventListener('click', () => {
        firebase.auth().signInWithPopup(googleProvider).catch(error => {
          console.error('Google login error:', error);
          alert('Google login failed: ' + error.message);
        });
      });
      
      loginGithubBtn?.addEventListener('click', () => {
        firebase.auth().signInWithPopup(githubProvider).catch(error => {
          console.error('GitHub login error:', error);
          alert('GitHub login failed: ' + error.message);
        });
      });
      
    } catch (error) {
      console.error('Firebase initialization error:', error);
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
});
