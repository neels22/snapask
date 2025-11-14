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

