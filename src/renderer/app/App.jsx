import React, { useState, useEffect } from 'react';

function App() {
  const [currentScreenshotDataUrl, setCurrentScreenshotDataUrl] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [promptValue, setPromptValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState('Checking...');
  const [apiKeyStatusColor, setApiKeyStatusColor] = useState('#fff');
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    // Receive initial data from main process
    window.snapask.onAppData((data) => {
      setCurrentScreenshotDataUrl(data.screenshot);
      setConversationHistory(data.conversation || []);
    });
  }, []);

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handleClose = () => {
    window.snapask.closeAppWindow();
  };

  const handleSend = async () => {
    const prompt = promptValue.trim() || 'Explain this image';
    
    setIsSending(true);
    setPromptValue('');
    
    // Add prompt to conversation immediately with loading answer
    const newConversation = [...conversationHistory, { prompt, answer: 'Thinking...', loading: true }];
    setConversationHistory(newConversation);
    
    try {
      const result = await window.snapask.askAI(prompt, currentScreenshotDataUrl);
      
      // Update the last answer (replace loading message)
      setConversationHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          prompt,
          answer: result.success ? result.text : `Error: ${result.error}`,
          loading: false
        };
        return updated;
      });
    } catch (error) {
      setConversationHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          prompt,
          answer: `Error: ${error.message}`,
          loading: false
        };
        return updated;
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenSettings = async () => {
    setShowSettings(true);
    await checkApiKeyStatus();
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    setApiKeyInput('');
  };

  const checkApiKeyStatus = async () => {
    try {
      const apiKey = await window.snapask.getApiKey();
      if (apiKey) {
        const masked = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
        setApiKeyStatus(`Configured (${masked})`);
        setApiKeyStatusColor('#4ade80');
      } else {
        setApiKeyStatus('Not configured');
        setApiKeyStatusColor('#f87171');
      }
    } catch (error) {
      setApiKeyStatus('Error checking status');
      setApiKeyStatusColor('#f87171');
    }
  };

  const handleSaveApiKey = async () => {
    const apiKey = apiKeyInput.trim();
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }
    
    try {
      const result = await window.snapask.saveApiKey(apiKey);
      if (result.success) {
        alert('API key saved successfully!');
        setApiKeyInput('');
        await checkApiKeyStatus();
        setShowSettings(false);
      } else {
        alert('Error saving API key: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error saving API key: ' + error.message);
    }
  };

  const handleApiKeyKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveApiKey();
    }
  };

  const handleCopyAnswer = async (answer, index) => {
    try {
      const result = await window.snapask.copyToClipboard(answer);
      if (result.success) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000); // Hide toast after 2 seconds
      } else {
        alert('Failed to copy: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to copy: ' + error.message);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <h1 className="app-title">SnapAsk</h1>
        <div className="header-buttons">
          <button className="settings-btn" onClick={handleOpenSettings} title="Settings">⚙️</button>
          <button className="close-btn" onClick={handleClose} title="Close">×</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="app-content">
        {/* Screenshot Display */}
        <div className="screenshot-section">
          <div className="screenshot-container">
            {currentScreenshotDataUrl && (
              <img src={currentScreenshotDataUrl} alt="Screenshot" />
            )}
          </div>
        </div>

        {/* Conversation History */}
        <div className="conversation-section">
          <h2 className="section-title">Conversation</h2>
          <div className="conversation-list">
            {conversationHistory.length === 0 ? (
              <div className="conversation-item">
                <div className="conversation-item-content" style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                  No conversation yet. Start by asking a question!
                </div>
              </div>
            ) : (
              conversationHistory.map((item, index) => (
                <React.Fragment key={index}>
                  {/* Prompt */}
                  <div className="conversation-item prompt">
                    <div className="conversation-item-header">You</div>
                    <div className="conversation-item-content" dangerouslySetInnerHTML={{ __html: escapeHtml(item.prompt) }} />
                  </div>
                  {/* Answer */}
                  <div className="conversation-item answer">
                    <div className="conversation-item-header-wrapper">
                      <div className="conversation-item-header">SnapAsk</div>
                      {!item.loading && (
                        <button
                          className="copy-btn"
                          onClick={() => handleCopyAnswer(item.answer, index)}
                          title="Copy answer"
                        >
                          {copiedIndex === index ? '✓' : '📋'}
                        </button>
                      )}
                    </div>
                    <div className={`conversation-item-content ${item.loading ? 'loading' : ''}`} dangerouslySetInnerHTML={{ __html: escapeHtml(item.answer) }} />
                    {copiedIndex === index && (
                      <div className="copy-toast">Copied!</div>
                    )}
                  </div>
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="input-section">
          <div className="input-wrapper">
            <input
              className="app-prompt-input"
              type="text" 
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question..." 
              autoComplete="off"
              disabled={isSending}
            />
            <button className="send-btn" onClick={handleSend} disabled={isSending}>
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-modal show" onClick={(e) => e.target.className.includes('settings-modal') && handleCloseSettings()}>
          <div className="settings-content">
            <div className="settings-header">
              <h2>Settings</h2>
              <button className="settings-close-btn" onClick={handleCloseSettings}>×</button>
            </div>
            <div className="settings-body">
              <div className="settings-section">
                <h3>API Key</h3>
                <p className="settings-description">Update your Google Gemini API key</p>
                <div className="api-key-status">
                  <span>Status: </span>
                  <span style={{ color: apiKeyStatusColor }}>{apiKeyStatus}</span>
                </div>
                <input
                  className="settings-input"
                  type="password" 
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={handleApiKeyKeyDown}
                  placeholder="Enter your new API key"
                  autoComplete="off"
                />
                <div className="settings-help">
                  Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>
                </div>
                <button className="settings-save-btn" onClick={handleSaveApiKey}>
                  Save API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

