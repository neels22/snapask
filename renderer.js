let currentScreenshotDataUrl = null;
let currentConversation = [];

// Receive screenshot from main process
window.snapask.onScreenshot((dataUrl) => {
  currentScreenshotDataUrl = dataUrl;
  
  // Display thumbnail
  const img = new Image();
  img.src = dataUrl;
  const container = document.getElementById('thumbnailContainer');
  container.innerHTML = '';
  container.appendChild(img);
  
  // Don't auto-focus - this would activate the window and steal focus
  // User can click on the input when they want to type
});

// Close button
document.getElementById('closeBtn').addEventListener('click', () => {
  window.snapask.closeWindow();
});

// ESC key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.snapask.closeWindow();
  }
});

// Enter key to ask
document.getElementById('promptInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('askBtn').click();
  }
});

// Ask button
document.getElementById('askBtn').addEventListener('click', async () => {
  const promptInput = document.getElementById('promptInput');
  const prompt = promptInput.value.trim() || 'Explain this image';
  const answerText = document.getElementById('answerText');
  const askBtn = document.getElementById('askBtn');
  
  // Disable button and show loading
  askBtn.disabled = true;
  answerText.className = 'answer-text loading';
  answerText.textContent = 'Thinking...';
  
  try {
    // Call Gemini AI through the main process
    const result = await window.snapask.askAI(prompt, currentScreenshotDataUrl);
    
    answerText.className = 'answer-text';
    
    if (result.success) {
      answerText.textContent = result.text;
      
      // Store in conversation history
      currentConversation.push({
        prompt: prompt,
        answer: result.text,
        timestamp: new Date().toISOString()
      });
    } else {
      answerText.textContent = `Error: ${result.error}`;
    }
    
  } catch (error) {
    answerText.className = 'answer-text';
    answerText.textContent = `Error: ${error.message}`;
  } finally {
    askBtn.disabled = false;
  }
});

// Continue in app button
document.getElementById('continueBtn').addEventListener('click', () => {
  window.snapask.openMainApp({
    screenshot: currentScreenshotDataUrl,
    conversation: currentConversation
  });
});

