import React, { useState, useEffect } from 'react';

function App() {
  const [currentScreenshotDataUrl, setCurrentScreenshotDataUrl] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState('Checking...');
  const [apiKeyStatusColor, setApiKeyStatusColor] = useState('#fff');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationsList, setConversationsList] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Load conversations list for sidebar
  const loadConversationsList = async () => {
    setLoadingConversations(true);
    try {
      const result = await window.snapask.loadConversations(100, 0);
      if (result.success) {
        setConversationsList(result.conversations || []);
      } else {
        console.error('Failed to load conversations:', result.error);
        setConversationsList([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversationsList([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    // Load conversations list on mount
    loadConversationsList();

    // Receive initial data from main process
    window.snapask.onAppData(async (data) => {
      if (data.conversationId) {
        // Load existing conversation from database
        console.log('Loading conversation from database:', data.conversationId);
        try {
          const result = await window.snapask.loadConversation(data.conversationId);
          if (result.success && result.conversation) {
            setConversationId(result.conversation.id);
            setCurrentScreenshotDataUrl(result.conversation.screenshot_data_url);
            
            // Convert messages to conversation history format
            const history = [];
            const messages = result.conversation.messages || [];
            
            for (let i = 0; i < messages.length; i += 2) {
              const userMsg = messages[i];
              const assistantMsg = messages[i + 1];
              
              if (userMsg && assistantMsg) {
                history.push({
                  prompt: userMsg.content,
                  answer: assistantMsg.content,
                  loading: false,
                  error: assistantMsg.error
                });
              }
            }
            
            setConversationHistory(history);
            console.log('Loaded conversation with', history.length, 'messages');
          } else {
            console.warn('Failed to load conversation:', result.error);
            // Fallback to data from popup
            setCurrentScreenshotDataUrl(data.screenshot);
            setConversationHistory(data.conversation || []);
          }
        } catch (error) {
          console.error('Error loading conversation:', error);
          // Fallback to data from popup
          setCurrentScreenshotDataUrl(data.screenshot);
          setConversationHistory(data.conversation || []);
        }
      } else {
        // New conversation from popup (no ID yet)
        setCurrentScreenshotDataUrl(data.screenshot);
        setConversationHistory(data.conversation || []);
        
        // If conversation exists, save it to database
        if (data.conversation && data.conversation.length > 0 && data.screenshot) {
          try {
            const saveResult = await window.snapask.saveConversation({
              screenshot: data.screenshot,
              conversation: data.conversation
            });
            if (saveResult.success) {
              setConversationId(saveResult.conversationId);
              console.log('Saved conversation to database:', saveResult.conversationId);
            }
          } catch (error) {
            console.error('Error saving conversation:', error);
          }
        }
      }
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
        let answerText;
        let isError = false;
        
        if (result.success) {
          answerText = result.text;
        } else {
          isError = true;
          // Check if it's a quota error
          if (result.error === 'API_QUOTA_EXCEEDED' || result.errorType === 'QUOTA_EXCEEDED') {
            answerText = '⚠️ API quota limit reached. Please update your API key in settings or check your Google Cloud billing.';
          } else {
            answerText = `Error: ${result.error}`;
          }
        }
        
        updated[updated.length - 1] = {
          prompt,
          answer: answerText,
          loading: false,
          error: isError
        };
        
        // Save to database
        saveMessageToDatabase(prompt, answerText, isError);
        
        return updated;
      });
    } catch (error) {
      setConversationHistory(prev => {
        const updated = [...prev];
        const errorMessage = `Error: ${error.message}`;
        updated[updated.length - 1] = {
          prompt,
          answer: errorMessage,
          loading: false,
          error: true
        };
        
        // Save error to database
        saveMessageToDatabase(prompt, errorMessage, true);
        
        return updated;
      });
    } finally {
      setIsSending(false);
    }
  };

  const saveMessageToDatabase = async (prompt, answer, isError) => {
    try {
      if (!conversationId) {
        // Create new conversation
        const saveResult = await window.snapask.saveConversation({
          screenshot: currentScreenshotDataUrl,
          conversation: [{ prompt, answer, error: isError }]
        });
        
        if (saveResult.success) {
          setConversationId(saveResult.conversationId);
          console.log('Created new conversation:', saveResult.conversationId);
          // Refresh conversations list to show new conversation
          loadConversationsList();
        } else {
          console.warn('Failed to create conversation:', saveResult.error);
        }
      } else {
        // Add messages to existing conversation
        await window.snapask.saveMessage(conversationId, 'user', prompt, false);
        await window.snapask.saveMessage(conversationId, 'assistant', answer, isError);
        console.log('Saved messages to conversation:', conversationId);
      }
    } catch (dbError) {
      console.error('Database error (non-critical):', dbError);
      // Don't block user flow if DB save fails
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

  const handleDeleteConversation = (conversationId) => {
    setConversationToDelete(conversationId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!conversationToDelete) return;

    try {
      const result = await window.snapask.deleteConversation(conversationToDelete);
      if (result.success) {
        // Refresh conversations list
        await loadConversationsList();
        
        // If deleted conversation is currently open, clear the view
        if (conversationId === conversationToDelete) {
          setConversationId(null);
          setConversationHistory([]);
          setCurrentScreenshotDataUrl(null);
        }
        
        setShowDeleteConfirm(false);
        setConversationToDelete(null);
      } else {
        alert('Failed to delete conversation: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error deleting conversation: ' + error.message);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setConversationToDelete(null);
  };

  const handleConversationClick = async (conversationId) => {
    try {
      const result = await window.snapask.loadConversation(conversationId);
      if (result.success && result.conversation) {
        setConversationId(result.conversation.id);
        setCurrentScreenshotDataUrl(result.conversation.screenshot_data_url);
        
        // Convert messages to conversation history format
        const history = [];
        const messages = result.conversation.messages || [];
        
        for (let i = 0; i < messages.length; i += 2) {
          const userMsg = messages[i];
          const assistantMsg = messages[i + 1];
          
          if (userMsg && assistantMsg) {
            history.push({
              prompt: userMsg.content,
              answer: assistantMsg.content,
              loading: false,
              error: assistantMsg.error
            });
          }
        }
        
        setConversationHistory(history);
        setSidebarOpen(false); // Close sidebar after selecting conversation
        // Refresh conversations list to update active state
        loadConversationsList();
      } else {
        alert('Failed to load conversation: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error loading conversation: ' + error.message);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <h1 className="app-title">SnapAsk</h1>
        <div className="header-buttons">
          <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Conversations">
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <button className="settings-btn" onClick={handleOpenSettings} title="Settings">⚙️</button>
          <button className="close-btn" onClick={handleClose} title="Close">×</button>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="app-main-layout">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="sidebar">
            <div className="sidebar-header">
              <h2 className="sidebar-title">Conversations</h2>
              <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} title="Close sidebar">×</button>
            </div>
            <div className="sidebar-list">
              {loadingConversations ? (
                <div className="sidebar-empty">Loading conversations...</div>
              ) : conversationsList.length === 0 ? (
                <div className="sidebar-empty">No conversations yet</div>
              ) : (
                conversationsList.map((conv) => (
                  <div
                    key={conv.id}
                    className={`sidebar-item ${conversationId === conv.id ? 'active' : ''}`}
                    onClick={() => handleConversationClick(conv.id)}
                  >
                    <div className="sidebar-item-content">
                      <div className="sidebar-item-title">{conv.title || 'Untitled Conversation'}</div>
                      {conv.preview && (
                        <div className="sidebar-item-preview">{conv.preview}</div>
                      )}
                      <div className="sidebar-item-meta">
                        {formatTimestamp(conv.updated_at)}
                        {conv.message_count > 0 && ` • ${conv.message_count} message${conv.message_count !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div className="sidebar-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteConversation(conv.id)}
                        title="Delete conversation"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
                      {!item.loading && !item.error && (
                        <button
                          className="copy-btn"
                          onClick={() => handleCopyAnswer(item.answer, index)}
                          title="Copy answer"
                        >
                          {copiedIndex === index ? '✓' : '📋'}
                        </button>
                      )}
                    </div>
                    <div className={`conversation-item-content ${item.loading ? 'loading' : ''} ${item.error ? 'error' : ''}`} dangerouslySetInnerHTML={{ __html: escapeHtml(item.answer) }} />
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-modal show" onClick={(e) => e.target.className.includes('delete-confirm-modal') && cancelDelete()}>
          <div className="delete-confirm-content">
            <div className="delete-confirm-header">
              <h2>Delete Conversation?</h2>
            </div>
            <div className="delete-confirm-body">
              <p>Are you sure you want to delete this conversation? This action cannot be undone.</p>
            </div>
            <div className="delete-confirm-buttons">
              <button className="delete-cancel-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

