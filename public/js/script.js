// Client-side JavaScript with Firebase Authentication
import { firebaseConfig } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  const moodInput = document.getElementById('mood');
  const submitButton = document.getElementById('go');
  const resultsList = document.getElementById('results');
  const authContainer = document.getElementById('auth-container');
  const loginButtons = document.getElementById('login-buttons');
  const userProfile = document.getElementById('user-profile');
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  const logoutButton = document.getElementById('logout-button');
  
  let currentUser = null;
  
  // Initialize Firebase
  initializeFirebase();
  
  // Handle form submission
  submitButton.addEventListener('click', async () => {
    // Clear previous results
    resultsList.innerHTML = '';
    
    // Get mood input
    const mood = moodInput.value.trim();
    if (!mood) {
      alert('Please enter your mood');
      return;
    }
    
    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loading"></span>Thinking...';
    
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
      
      // Display movie recommendations
      if (Array.isArray(data) && data.length > 0) {
        data.forEach(movie => {
          const listItem = document.createElement('li');
          listItem.className = 'movie-card';
          
          listItem.innerHTML = `
            <div class="movie-title">${movie.title} <span class="movie-year">(${movie.year})</span></div>
            <div class="movie-reason">${movie.reason}</div>
          `;
          
          resultsList.appendChild(listItem);
        });
      } else {
        resultsList.innerHTML = '<li class="movie-card">No recommendations found. Try describing your mood differently.</li>';
      }
    } catch (error) {
      console.error('Error:', error);
      resultsList.innerHTML = `<li class="movie-card">Error: ${error.message}</li>`;
    } finally {
      // Reset button state after 6 seconds (prevent API rate limiting)
      setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Get Movies';
      }, 6000);
    }
  });
  
  // Enable submit on Enter key
  moodInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' && !submitButton.disabled) {
      submitButton.click();
    }
  });
  
  // Initialize Firebase
  function initializeFirebase() {
    // Load Firebase SDK
    const script1 = document.createElement('script');
    script1.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
    document.head.appendChild(script1);
    
    const script2 = document.createElement('script');
    script2.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
    script2.onload = setupFirebaseAuth;
    document.head.appendChild(script2);
  }
  
  // Set up Firebase Auth
  function setupFirebaseAuth() {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Set up auth providers
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    const githubProvider = new firebase.auth.GithubAuthProvider();
    
    // Auth state change listener
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // User is signed in
        currentUser = user;
        updateUIForSignedInUser(user);
      } else {
        // User is signed out
        currentUser = null;
        updateUIForSignedOutUser();
      }
    });
    
    // Add login event listeners if elements exist
    if (loginButtons) {
      const googleBtn = document.getElementById('login-google');
      const githubBtn = document.getElementById('login-github');
      
      if (googleBtn) {
        googleBtn.addEventListener('click', () => {
          firebase.auth().signInWithPopup(googleProvider).catch(error => {
            console.error('Google login error:', error);
            alert('Google login failed: ' + error.message);
          });
        });
      }
      
      if (githubBtn) {
        githubBtn.addEventListener('click', () => {
          firebase.auth().signInWithPopup(githubProvider).catch(error => {
            console.error('GitHub login error:', error);
            alert('GitHub login failed: ' + error.message);
          });
        });
      }
    }
    
    // Add logout event listener
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        firebase.auth().signOut().catch(error => {
          console.error('Logout error:', error);
        });
      });
    }
  }
  
  // Update UI for signed-in users
  function updateUIForSignedInUser(user) {
    if (loginButtons) loginButtons.style.display = 'none';
    if (userProfile) {
      userProfile.style.display = 'flex';
      userName.textContent = user.displayName || user.email;
      if (user.photoURL) {
        userAvatar.src = user.photoURL;
        userAvatar.style.display = 'block';
      } else {
        userAvatar.style.display = 'none';
      }
    }
  }
  
  // Update UI for signed-out users
  function updateUIForSignedOutUser() {
    if (loginButtons) loginButtons.style.display = 'flex';
    if (userProfile) userProfile.style.display = 'none';
  }
});
