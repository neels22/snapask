let selectedOption = null;

// Handle option selection
document.getElementById('apiKeyOption').addEventListener('click', () => {
  selectedOption = 'apiKey';
  document.getElementById('apiKeyOption').classList.add('selected');
  document.getElementById('premiumOption').classList.remove('selected');
  document.getElementById('apiKeyInput').classList.add('show');
  document.getElementById('continueBtn').disabled = false;
});

document.getElementById('premiumOption').addEventListener('click', () => {
  selectedOption = 'premium';
  document.getElementById('premiumOption').classList.add('selected');
  document.getElementById('apiKeyOption').classList.remove('selected');
  document.getElementById('apiKeyInput').classList.remove('show');
  document.getElementById('continueBtn').disabled = true; // Disable since premium not available
  alert('Premium feature is coming soon! Please use your own API key for now.');
});

// Handle API key input
const apiKeyField = document.getElementById('apiKeyField');
apiKeyField.addEventListener('input', () => {
  const hasValue = apiKeyField.value.trim().length > 0;
  document.getElementById('continueBtn').disabled = !hasValue || selectedOption !== 'apiKey';
});

// Handle Enter key in API key field
apiKeyField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !document.getElementById('continueBtn').disabled) {
    document.getElementById('continueBtn').click();
  }
});

// Handle continue button
document.getElementById('continueBtn').addEventListener('click', async () => {
  if (selectedOption === 'apiKey') {
    const apiKey = apiKeyField.value.trim();
    if (apiKey) {
      // Disable button to prevent multiple clicks
      const btn = document.getElementById('continueBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      
      try {
        // Send API key to main process
        const result = await window.snapask.saveApiKey(apiKey);
        if (result.success) {
          // Close onboarding window
          window.snapask.closeOnboarding();
        } else {
          alert('Error saving API key: ' + (result.error || 'Unknown error'));
          btn.disabled = false;
          btn.textContent = 'Continue';
        }
      } catch (error) {
        alert('Error saving API key: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Continue';
      }
    }
  }
});

