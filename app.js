let currentScreenshotDataUrl = null;
let conversationHistory = [];

// Receive initial data from main process
window.snapask.onAppData((data) => {
  currentScreenshotDataUrl = data.screenshot;
  conversationHistory = data.conversation || [];
  
  // Display screenshot
  if (currentScreenshotDataUrl) {
    const img = new Image();
    img.src = currentScreenshotDataUrl;
    const container = document.getElementById('screenshotContainer');
    container.innerHTML = '';
    container.appendChild(img);
  }
  
  // Display conversation history
  renderConversation();
});

// Render conversation history
function renderConversation() {
  const list = document.getElementById('conversationList');
  list.innerHTML = '';
  
  if (conversationHistory.length === 0) {
    list.innerHTML = '<div class="conversation-item"><div class="conversation-item-content" style="color: rgba(255,255,255,0.5); font-style: italic;">No conversation yet. Start by asking a question!</div></div>';
    return;
  }
  
  conversationHistory.forEach((item) => {
    // Add prompt
    const promptDiv = document.createElement('div');
    promptDiv.className = 'conversation-item prompt';
    promptDiv.innerHTML = `
      <div class="conversation-item-header">You</div>
      <div class="conversation-item-content">${escapeHtml(item.prompt)}</div>
    `;
    list.appendChild(promptDiv);
    
    // Add answer
    const answerDiv = document.createElement('div');
    answerDiv.className = 'conversation-item answer';
    answerDiv.innerHTML = `
      <div class="conversation-item-header">SnapAsk</div>
      <div class="conversation-item-content">${escapeHtml(item.answer)}</div>
    `;
    list.appendChild(answerDiv);
  });
  
  // Scroll to bottom
  list.scrollTop = list.scrollHeight;
}

// Add new conversation item
function addConversationItem(prompt, answer) {
  conversationHistory.push({
    prompt: prompt,
    answer: answer,
    timestamp: new Date().toISOString()
  });
  renderConversation();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close button
document.getElementById('closeAppBtn').addEventListener('click', () => {
  window.snapask.closeAppWindow();
});

// Send button
document.getElementById('sendBtn').addEventListener('click', async () => {
  await sendMessage();
});

// Enter key to send
document.getElementById('appPromptInput').addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    await sendMessage();
  }
});

// Send message function
async function sendMessage() {
  const input = document.getElementById('appPromptInput');
  const prompt = input.value.trim() || 'Explain this image';  // Default prompt like popup
  const sendBtn = document.getElementById('sendBtn');
  
  // Disable input and show loading
  input.disabled = true;
  sendBtn.disabled = true;
  
  // Add prompt to conversation immediately
  const loadingAnswer = 'Thinking...';
  addConversationItem(prompt, loadingAnswer);
  
  // Clear input
  input.value = '';
  
  try {
    // Call AI
    const result = await window.snapask.askAI(prompt, currentScreenshotDataUrl);
    
    if (result.success) {
      // Update the last answer (replace loading message)
      conversationHistory[conversationHistory.length - 1].answer = result.text;
      renderConversation();
    } else {
      // Update with error
      conversationHistory[conversationHistory.length - 1].answer = `Error: ${result.error}`;
      renderConversation();
    }
  } catch (error) {
    conversationHistory[conversationHistory.length - 1].answer = `Error: ${error.message}`;
    renderConversation();
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

// Settings functionality
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyStatusText = document.getElementById('apiKeyStatusText');

// Open settings
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('show');
  checkApiKeyStatus();
});

// Close settings
settingsCloseBtn.addEventListener('click', () => {
  settingsModal.classList.remove('show');
  apiKeyInput.value = '';
});

// Close settings when clicking outside
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('show');
    apiKeyInput.value = '';
  }
});

// Check API key status
async function checkApiKeyStatus() {
  try {
    const apiKey = await window.snapask.getApiKey();
    if (apiKey) {
      // Show masked version (first 8 chars + ...)
      const masked = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
      apiKeyStatusText.textContent = `Configured (${masked})`;
      apiKeyStatusText.style.color = '#4ade80';
    } else {
      apiKeyStatusText.textContent = 'Not configured';
      apiKeyStatusText.style.color = '#f87171';
    }
  } catch (error) {
    apiKeyStatusText.textContent = 'Error checking status';
    apiKeyStatusText.style.color = '#f87171';
  }
}

// Save API key
saveApiKeyBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }
  
  saveApiKeyBtn.disabled = true;
  saveApiKeyBtn.textContent = 'Saving...';
  
  try {
    const result = await window.snapask.saveApiKey(apiKey);
    if (result.success) {
      alert('API key saved successfully!');
      apiKeyInput.value = '';
      checkApiKeyStatus();
      settingsModal.classList.remove('show');
    } else {
      alert('Error saving API key: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Error saving API key: ' + error.message);
  } finally {
    saveApiKeyBtn.disabled = false;
    saveApiKeyBtn.textContent = 'Save API Key';
  }
});

// Allow Enter key to save
apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !saveApiKeyBtn.disabled) {
    saveApiKeyBtn.click();
  }
});

