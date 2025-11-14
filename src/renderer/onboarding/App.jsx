import React, { useState } from 'react';

function App() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleApiKeyOption = () => {
    setSelectedOption('apiKey');
  };

  const handlePremiumOption = () => {
    setSelectedOption('premium');
    alert('Premium feature is coming soon! Please use your own API key for now.');
  };

  const handleContinue = async () => {
    if (selectedOption === 'apiKey') {
      const apiKey = apiKeyValue.trim();
      if (apiKey) {
        setIsSaving(true);
        
        try {
          const result = await window.snapask.saveApiKey(apiKey);
          if (result.success) {
            window.snapask.closeOnboarding();
          } else {
            alert('Error saving API key: ' + (result.error || 'Unknown error'));
            setIsSaving(false);
          }
        } catch (error) {
          alert('Error saving API key: ' + error.message);
          setIsSaving(false);
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isSaving && selectedOption === 'apiKey' && apiKeyValue.trim()) {
      handleContinue();
    }
  };

  const isContinueDisabled = !apiKeyValue.trim() || selectedOption !== 'apiKey' || isSaving;

  return (
    <div className="onboarding-container">
      <div className="logo">
        <h1>Welcome to SnapAsk</h1>
        <p>Get started by choosing an option below</p>
      </div>
      
      <div className="options">
        <div 
          className={`option-card ${selectedOption === 'apiKey' ? 'selected' : ''}`}
          onClick={handleApiKeyOption}
        >
          <h3>Use Your Own API Key</h3>
          <p>Enter your Google Gemini API key to get started</p>
        </div>
        
        <div 
          className={`option-card ${selectedOption === 'premium' ? 'selected' : ''}`}
          onClick={handlePremiumOption}
        >
          <h3>Buy Premium <span className="premium-badge">Coming Soon</span></h3>
          <p>Use SnapAsk with our premium API key (not available yet)</p>
        </div>
      </div>
      
      <div className={`api-key-input ${selectedOption === 'apiKey' ? 'show' : ''}`}>
        <input 
          type="password" 
          value={apiKeyValue}
          onChange={(e) => setApiKeyValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your Gemini API key"
          autoComplete="off"
        />
        <div className="help-text">
          Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>
        </div>
      </div>
      
      <div className="button-group">
        <button 
          className="primary-btn" 
          onClick={handleContinue}
          disabled={isContinueDisabled}
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

export default App;

