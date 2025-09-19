const jwt = require('jsonwebtoken');

// Test the API manually
const testUserId = '7de3fcda-3a2f-4720-b7af-f5e515ebc984'; // Max's user ID from the logs

// Create a test token for the user (same as what the client would have)
const testToken = jwt.sign({
  id: testUserId,
  email: 'max@mustermann.de',
  name: 'Max',
  last_name: 'Mustermann',
  role: 'CUSTOMER',
  isAffiliate: false,
  isCustomer: true
}, 'your-secret-key-here', { expiresIn: '2h' });

console.log('🔍 Test token created for user:', testUserId);

// Test the API call
fetch(`http://localhost:3000/dailyCheck/listWithViolations/${testUserId}`, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testToken}`
  }
})
.then(response => {
  console.log('🔍 Response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('🔍 Response data:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('🔍 Error:', error);
});