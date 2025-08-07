// Build script for Firebase hosting - UPDATED
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

console.log('🔨 Building static files for Firebase hosting...');

// Read the EJS template
const templatePath = path.join(__dirname, '../views/index.ejs');
const template = fs.readFileSync(templatePath, 'utf8');

// Render the template to HTML
const html = ejs.render(template, {
  // You can pass any variables here if needed
});

// Update the HTML to work with static hosting
const staticHtml = html
  .replace(
    '<script type="module" src="/js/script.js"></script>',
    `<script>
      // Set API endpoint for static hosting
      window.API_BASE_URL = 'https://mood2movie-api.vercel.app'; // Will be updated after Vercel deployment
    </script>
    <script type="module" src="/js/script.js"></script>`
  )
  .replace(
    '</head>',
    `  <!-- Firebase Hosting Meta -->
  <meta name="description" content="Find perfect movies based on your current mood using AI">
  <meta name="keywords" content="movies, mood, recommendation, AI, entertainment">
</head>`
  );

// Create the HTML file in public directory
const outputPath = path.join(__dirname, '../public/index.html');
fs.writeFileSync(outputPath, staticHtml);

console.log('✅ Build completed! Static files ready for Firebase hosting.');
console.log('📁 Generated:', outputPath);

// Verify the file was created
if (fs.existsSync(outputPath)) {
  const stats = fs.statSync(outputPath);
  console.log(`📊 File size: ${stats.size} bytes`);
  console.log('🔍 Preview first 200 characters:');
  console.log(fs.readFileSync(outputPath, 'utf8').substring(0, 200) + '...');
} else {
  console.error('❌ Error: File was not created!');
}
