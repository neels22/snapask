import React, { useState, useEffect } from 'react';

function App() {
  const [currentScreenshotDataUrl, setCurrentScreenshotDataUrl] = useState(null);
  const [currentConversation, setCurrentConversation] = useState([]);
  const [promptValue, setPromptValue] = useState('');
  const [answerText, setAnswerText] = useState('Your answer will appear here...');
  const [answerClass, setAnswerClass] = useState('answer-text placeholder');
  const [isAsking, setIsAsking] = useState(false);

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
        <div className={answerClass}>
          {answerText}
        </div>
      </div>
    </div>
  );
}

export default App;

