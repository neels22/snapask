import React, { useState, useEffect } from 'react';

function App() {
  const [currentScreenshotDataUrl, setCurrentScreenshotDataUrl] = useState(null);
  const [currentConversation, setCurrentConversation] = useState([]);
  const [promptValue, setPromptValue] = useState('');
  const [answerText, setAnswerText] = useState('Your answer will appear here...');
  const [answerClass, setAnswerClass] = useState('answer-text placeholder');
  const [isAsking, setIsAsking] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

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
      
      setAnswerClass('answer-text');
      
      if (result.success) {
        setAnswerText(result.text);
        
        // Store in conversation history
        setCurrentConversation([...currentConversation, {
          prompt: prompt,
          answer: result.text,
          timestamp: new Date().toISOString()
        }]);
      } else {
        setAnswerText(`Error: ${result.error}`);
      }
    } catch (error) {
      setAnswerClass('answer-text');
      setAnswerText(`Error: ${error.message}`);
    } finally {
      setIsAsking(false);
    }
  };

  const handleContinue = () => {
    const data = {
      screenshot: currentScreenshotDataUrl,
      conversation: currentConversation
    };
    window.snapask.openMainApp(data);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
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
        <button className="close-btn" onClick={handleClose} title="Close (Esc)">×</button>
      </div>
      
      <div className="thumbnail-container" id="thumbnailContainer">
        {currentScreenshotDataUrl && (
          <img src={currentScreenshotDataUrl} alt="Screenshot" />
        )}
      </div>
      
      <div className="input-container">
        <input 
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
          Ask
        </button>
        <button className="secondary-btn" onClick={handleContinue}>
          Continue in App
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

