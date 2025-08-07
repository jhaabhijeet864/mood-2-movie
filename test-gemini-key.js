// Script to test if the Gemini API key is working
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use the API key from the environment variable or directly (for testing only)
const apiKey = 'AIzaSyCmNqbPHi1zbtKsGWr0Drdgx7iludCfT9A';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(apiKey);

// Function to test the API key with a simple prompt
async function testApiKey() {
  try {
    console.log('Testing Gemini API key...');
    
    // Create a model instance with the gemini-2.5-flash model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Generate a simple response to test the API key
    const prompt = 'Respond with "API key is working!" if you receive this message.';
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('API Response:', text);
    console.log('Success! Your Gemini API key is valid and working.');
    return true;
  } catch (error) {
    console.error('Error testing API key:', error.message);
    console.log('Your API key appears to be invalid or there was an error connecting to the Gemini API.');
    return false;
  }
}

// Run the test
testApiKey();
