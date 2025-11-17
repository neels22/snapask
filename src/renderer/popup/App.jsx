import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [currentScreenshotDataUrl, setCurrentScreenshotDataUrl] = useState(null);
  const [currentConversation, setCurrentConversation] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const [answerText, setAnswerText] = useState('Your answer will appear here...');
  const [answerClass, setAnswerClass] = useState('answer-text placeholder');
  const [isAsking, setIsAsking] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!window.snapask) {
      console.error('window.snapask is not available. Make sure preload script is loaded.');
      return;
    }

    // Receive screenshot from main process
    window.snapask.onScreenshot((dataUrl) => {
      setCurrentScreenshotDataUrl(dataUrl);
    });
  }, []);

  // Auto-focus input when popup mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Re-focus input when a new screenshot is received
  useEffect(() => {
    if (!currentScreenshotDataUrl) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentScreenshotDataUrl]);

  const handleClose = () => {
    window.snapask.closeWindow();
  };

  const handleAsk = async () => {
    const prompt = promptValue.trim() || 'Explain this image';
    
    setIsAsking(true);
    setAnswerClass('answer-text loading');
    setAnswerText('Thinking...');
    
    try {
      const result = await window.snapask.askAI(prompt, currentScreenshotDataUrl);
      
      if (result.success) {
        setAnswerClass('answer-text');
        setAnswerText(result.text);
        
        // Store in conversation history
        const newConversation = [...currentConversation, {
          prompt: prompt,
          answer: result.text,
          timestamp: new Date().toISOString(),
          error: false
        }];
        setCurrentConversation(newConversation);
        
        // Save to database
        try {
          if (!conversationId) {
            // Create new conversation in database
            const saveResult = await window.snapask.saveConversation({
              screenshot: currentScreenshotDataUrl,
              conversation: newConversation
            });
            
            if (saveResult.success) {
              setConversationId(saveResult.conversationId);
              console.log('Conversation saved to database:', saveResult.conversationId);
            } else {
              console.warn('Failed to save conversation:', saveResult.error);
            }
          } else {
            // Add messages to existing conversation
            await window.snapask.saveMessage(conversationId, 'user', prompt, false);
            await window.snapask.saveMessage(conversationId, 'assistant', result.text, false);
            console.log('Messages added to conversation:', conversationId);
          }
        } catch (dbError) {
          console.error('Database error (non-critical):', dbError);
          // Don't block user flow if DB save fails
        }
      } else {
        let errorMessage;
        const isError = true;
        
        // Check if it's a quota error
        if (result.error === 'API_QUOTA_EXCEEDED' || result.errorType === 'QUOTA_EXCEEDED') {
          setAnswerClass('answer-text error');
          errorMessage = '⚠️ API quota limit reached. Please update your API key in settings or check your Google Cloud billing.';
          setAnswerText(errorMessage);
        } else {
          setAnswerClass('answer-text error');
          errorMessage = `Error: ${result.error}`;
          setAnswerText(errorMessage);
        }
        
        // Save error to conversation
        const newConversation = [...currentConversation, {
          prompt: prompt,
          answer: errorMessage,
          timestamp: new Date().toISOString(),
          error: isError
        }];
        setCurrentConversation(newConversation);
      }
    } catch (error) {
      const errorMessage = `Error: ${error.message}`;
      setAnswerClass('answer-text error');
      setAnswerText(errorMessage);
      
      // Save error to conversation
      const newConversation = [...currentConversation, {
        prompt: prompt,
        answer: errorMessage,
        timestamp: new Date().toISOString(),
        error: true
      }];
      setCurrentConversation(newConversation);
    } finally {
      setIsAsking(false);
    }
  };

  const handleContinue = () => {
    const data = {
      conversationId: conversationId,  // Pass conversation ID if available
      screenshot: currentScreenshotDataUrl,
      conversation: currentConversation
    };
    window.snapask.openMainApp(data);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      // Cmd+Enter or Ctrl+Enter - Continue in App
      e.preventDefault();
      handleContinue();
    } else if (e.key === 'Enter') {
      // Regular Enter - Ask
      handleAsk();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  const handleCopyAnswer = async () => {
    if (answerClass === 'answer-text placeholder' || answerClass.includes('loading')) {
      return;
    }
    
    try {
      const result = await window.snapask.copyToClipboard(answerText);
      if (result.success) {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } else {
        alert('Failed to copy: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to copy: ' + error.message);
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="panel">
      <div className="header">
        <div className="title">SnapAsk</div>
        <button className="close-btn" onClick={handleClose} title="Close (Esc)">X (esc)</button>
      </div>
      
      <div className="thumbnail-container" id="thumbnailContainer">
        {currentScreenshotDataUrl && (
          <img src={currentScreenshotDataUrl} alt="Screenshot" />
        )}
      </div>
      
      <div className="input-container">
        <input 
          ref={inputRef}
          type="text" 
          value={promptValue}
          onChange={(e) => setPromptValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this screenshot..." 
          autoComplete="off"
        />
      </div>
      
      <div className="button-row">
        <button className="primary-btn" onClick={handleAsk} disabled={isAsking}>
          Ask (⏎)
        </button>
        <button className="secondary-btn" onClick={handleContinue}>
          Continue in App (⌘+⏎)
        </button>
      </div>
      
      <div className="answer-container">
        <div className="answer-header">
          <div className={answerClass}>
            {answerText}
          </div>
          {answerClass === 'answer-text' && (
            <button
              className="copy-btn-popup"
              onClick={handleCopyAnswer}
              title="Copy answer"
            >
              {showCopied ? '✓' : '📋'}
            </button>
          )}
        </div>
        {showCopied && (
          <div className="copy-toast-popup">Copied!</div>
        )}
      </div>
    </div>
  );
}

export default App;

