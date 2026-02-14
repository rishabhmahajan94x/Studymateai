
document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const chatArea = document.getElementById('chatArea');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const typingIndicator = document.getElementById('typingIndicator');
  const welcomeCard = document.getElementById('welcomeCard');
  const copyLastBtn = document.getElementById('copyLastBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const settingsToggleBtn = document.getElementById('settingsToggleBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const deleteHistoryBtn = document.getElementById('deleteHistoryBtn');
  const usernameInput = document.getElementById('usernameInput');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const animToggle = document.getElementById('animToggle');
  const usernameDisplay = document.getElementById('usernameDisplay');
  const errorPanel = document.getElementById('errorPanel');
  const errorMessage = document.getElementById('errorMessage');
  const closeErrorBtn = document.getElementById('closeErrorBtn');
  const modeBtns = document.querySelectorAll('.mode-btn');

  // State
  let username = localStorage.getItem('sm_username') || 'student';
  let apiKey = localStorage.getItem('sm_api_key') || '';
  let animationsEnabled = localStorage.getItem('sm_animations') !== 'false';
  let chatHistory = [];
  const MAX_HISTORY = 20;
  const SYSTEM_PROMPT = "You are a friendly school teacher. Explain in simple words. Use bullet points. Show steps in math. If quiz requested: Generate 5 MCQ and answers.";

  // Initialize
  loadChat();
  updateUsername();
  animToggle.checked = animationsEnabled;
  usernameInput.value = username;
  apiKeyInput.value = apiKey;

  if (chatHistory.length > 0) {
    welcomeCard.classList.add('hidden');
  }

  // Load chat from localStorage
  function loadChat() {
    const stored = localStorage.getItem('sm_chat');
    if (stored) {
      try {
        chatHistory = JSON.parse(stored);
        renderChat();
      } catch (e) {
        chatHistory = [];
      }
    }
  }

  // Save chat to localStorage
  function saveChat() {
    try {
      const toStore = chatHistory.slice(-MAX_HISTORY);
      localStorage.setItem('sm_chat', JSON.stringify(toStore));
    } catch (e) {}
  }

  // Update username display
  function updateUsername() {
    usernameDisplay.textContent = username;
  }

  // Render all messages
  function renderChat() {
    chatArea.innerHTML = '';
    chatHistory.forEach(msg => {
      addMessageToDOM(msg.role, msg.content, false);
    });
    scrollToBottom();
  }

  // Add single message to DOM
  function addMessageToDOM(role, content, animate = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.textContent = content;
    msgDiv.appendChild(contentDiv);
    
    if (role === 'ai') {
      const footer = document.createElement('div');
      footer.className = 'message-footer';
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-message-btn';
      copyBtn.innerHTML = '<img src="assets/icons/copy.svg" alt="copy" class="icon-small"> copy';
      
      copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(content);
        copyBtn.innerHTML = '<img src="assets/icons/check.svg" alt="check" class="icon-small"> copied';
        setTimeout(() => {
          copyBtn.innerHTML = '<img src="assets/icons/copy.svg" alt="copy" class="icon-small"> copy';
        }, 2000);
      });
      
      footer.appendChild(copyBtn);
      msgDiv.appendChild(footer);
    }
    
    if (!animationsEnabled) {
      msgDiv.style.animation = 'none';
    }
    
    chatArea.appendChild(msgDiv);
    scrollToBottom();
  }

  // Scroll chat to bottom
  function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // Show error message
  function showError(msg) {
    errorMessage.textContent = msg || 'Error connecting to AI';
    errorPanel.classList.remove('hidden');
    setTimeout(() => {
      errorPanel.classList.add('hidden');
    }, 4000);
  }

  // Hide welcome card if needed
  function updateWelcomeVisibility() {
    if (chatHistory.length > 0) {
      welcomeCard.classList.add('hidden');
    } else {
      welcomeCard.classList.remove('hidden');
    }
  }

  // Call AI API
  async function callAI(userMessage, modePrompt = '') {
    // Check if API key exists
    const key = apiKey || window.CONFIG.API_KEY;
    if (!key) {
      showError('Please enter your API key in settings');
      throw new Error('No API key');
    }

    let systemMsg = SYSTEM_PROMPT;
    if (modePrompt) {
      systemMsg += ' ' + modePrompt;
    }

    const messages = [
      { role: 'system', content: systemMsg },
      ...chatHistory.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(window.CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Send message
  async function sendMessage(userText, modeText = '') {
    if (!userText.trim()) return;
    
    welcomeCard.classList.add('hidden');
    
    // Add user message
    chatHistory.push({ role: 'user', content: userText });
    addMessageToDOM('user', userText);
    saveChat();
    
    // Show typing indicator
    typingIndicator.classList.remove('hidden');
    
    try {
      const aiResponse = await callAI(userText, modeText);
      
      typingIndicator.classList.add('hidden');
      
      chatHistory.push({ role: 'ai', content: aiResponse });
      addMessageToDOM('ai', aiResponse);
      saveChat();
      
    } catch (error) {
      typingIndicator.classList.add('hidden');
      showError('Failed to get response. Check API key.');
      
      const fallback = "I couldn't process your request. Please check your API key and try again.";
      chatHistory.push({ role: 'ai', content: fallback });
      addMessageToDOM('ai', fallback);
      saveChat();
    }
  }

  // Event Listeners
  sendBtn.addEventListener('click', function() {
    const text = messageInput.value.trim();
    if (text) {
      sendMessage(text);
      messageInput.value = '';
      messageInput.style.height = 'auto';
    }
  });

  messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  messageInput.addEventListener('input', function() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  });

  // Mode buttons
  modeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const mode = this.dataset.mode;
      const text = messageInput.value.trim();
      if (text) {
        sendMessage(text, mode);
        messageInput.value = '';
      } else {
        messageInput.focus();
      }
    });
  });

  // Copy last AI message
  copyLastBtn.addEventListener('click', function() {
    const lastAi = [...chatHistory].reverse().find(m => m.role === 'ai');
    if (lastAi) {
      navigator.clipboard.writeText(lastAi.content);
      copyLastBtn.innerHTML = '<img src="assets/icons/check.svg" alt="check" class="icon-small"> copied';
      setTimeout(() => {
        copyLastBtn.innerHTML = '<img src="assets/icons/copy.svg" alt="copy" class="icon-small"> Copy';
      }, 2000);
    }
  });

  // Clear chat
  clearChatBtn.addEventListener('click', function() {
    chatHistory = [];
    localStorage.removeItem('sm_chat');
    renderChat();
    welcomeCard.classList.remove('hidden');
  });

  // Settings panel
  settingsToggleBtn.addEventListener('click', function() {
    settingsModal.classList.toggle('hidden');
  });

  closeSettingsBtn.addEventListener('click', function() {
    settingsModal.classList.add('hidden');
  });

  saveSettingsBtn.addEventListener('click', function() {
    username = usernameInput.value.trim() || 'student';
    apiKey = apiKeyInput.value.trim();
    animationsEnabled = animToggle.checked;
    
    localStorage.setItem('sm_username', username);
    localStorage.setItem('sm_api_key', apiKey);
    localStorage.setItem('sm_animations', animationsEnabled);
    
    updateUsername();
    settingsModal.classList.add('hidden');
  });

  deleteHistoryBtn.addEventListener('click', function() {
    chatHistory = [];
    localStorage.removeItem('sm_chat');
    renderChat();
    welcomeCard.classList.remove('hidden');
  });

  closeErrorBtn.addEventListener('click', function() {
    errorPanel.classList.add('hidden');
  });

  // Close settings when clicking outside
  window.addEventListener('click', function(e) {
    if (!settingsModal.contains(e.target) && !settingsToggleBtn.contains(e.target)) {
      settingsModal.classList.add('hidden');
    }
  });

  // Initial render
  renderChat();
});
