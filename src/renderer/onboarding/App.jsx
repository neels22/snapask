import React, { useState, useEffect } from 'react';

function App() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('google');
  const [selectedModel, setSelectedModel] = useState('');
  const [providers, setProviders] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load available providers
    window.snapask.getAiProviders().then((result) => {
      if (result.success) {
        setProviders(result.providers);
        // Set default model for default provider
        if (result.providers[result.defaultProvider]?.models?.length > 0) {
          setSelectedModel(result.providers[result.defaultProvider].models[0].id);
        }
      }
    });
  }, []);

  useEffect(() => {
    // Update model when provider changes
    if (providers && providers[selectedProvider]?.models?.length > 0) {
      setSelectedModel(providers[selectedProvider].models[0].id);
    }
  }, [selectedProvider, providers]);

  const handleApiKeyOption = () => {
    setSelectedOption('apiKey');
  };

  const handlePremiumOption = () => {
    setSelectedOption('premium');
    alert('Premium feature is coming soon! Please use your own API key for now.');
  };

  const getProviderHelpUrl = (providerId) => {
    const urls = {
      google: 'https://makersuite.google.com/app/apikey',
      openai: 'https://platform.openai.com/api-keys',
      anthropic: 'https://console.anthropic.com/settings/keys',
    };
    return urls[providerId] || urls.google;
  };

  const getProviderName = (providerId) => {
    return providers?.[providerId]?.name || providerId;
  };

  const handleContinue = async () => {
    if (selectedOption === 'apiKey') {
      const apiKey = apiKeyValue.trim();
      if (apiKey && selectedProvider && selectedModel) {
        setIsSaving(true);
        
        try {
          const result = await window.snapask.saveApiKey({
            apiKey,
            provider: selectedProvider,
            model: selectedModel,
          });
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

  const isContinueDisabled = !apiKeyValue.trim() || selectedOption !== 'apiKey' || !selectedProvider || !selectedModel || isSaving;

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
          <p>Enter your AI provider API key to get started</p>
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
        {providers && (
          <>
            <div className="provider-selector">
              <label htmlFor="provider-select">AI Provider</label>
              <select
                id="provider-select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="provider-select"
              >
                {Object.keys(providers).map((providerId) => (
                  <option key={providerId} value={providerId}>
                    {providers[providerId].name}
                  </option>
                ))}
              </select>
            </div>

            <div className="model-selector">
              <label htmlFor="model-select">Model</label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="model-select"
              >
                {providers[selectedProvider]?.models?.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <input 
          type="password" 
          value={apiKeyValue}
          onChange={(e) => setApiKeyValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Enter your ${getProviderName(selectedProvider)} API key`}
          autoComplete="off"
        />
        <div className="help-text">
          Get your API key from <a href={getProviderHelpUrl(selectedProvider)} target="_blank" rel="noreferrer">
            {getProviderName(selectedProvider)} API Keys
          </a>
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
