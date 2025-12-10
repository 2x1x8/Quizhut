document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const startBtn = document.getElementById('startBtn');
  const scanBtn = document.getElementById('scanBtn');
  const answerBtn = document.getElementById('answerBtn');
  const clearBtn = document.getElementById('clearBtn');
  const apiKeyInput = document.getElementById('apiKey');
  const answersList = document.getElementById('answersList');
  const statusEl = document.getElementById('status');
  const pageTitleEl = document.getElementById('pageTitle');
  const questionDisplay = document.getElementById('questionDisplay');
  
  // State
  let currentQuestion = '';
  let currentAnswers = [];
  let savedAnswers = new Map();
  let isProcessing = false;
  
  // Load saved data
  chrome.storage.local.get(['apiKey', 'savedAnswers', 'enabled'], (result) => {
    apiKeyInput.value = result.apiKey || '';
    if (result.savedAnswers) {
      savedAnswers = new Map(JSON.parse(result.savedAnswers));
    }
    
    // Update UI based on enabled state
    if (result.enabled) {
      document.body.classList.add('enabled');
      showStatus('Extension enabled', 'success');
    }
  });
  
  // Get current page info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      pageTitleEl.textContent = tabs[0].title || 'No title';
    }
  });
  
  // Start Button - Begin cheating process
  startBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter your API key', 'error');
      return;
    }
    
    // Save API key
    chrome.storage.local.set({ apiKey, enabled: true });
    document.body.classList.add('enabled');
    
    // Scan the page for questions
    await scanPage();
    showStatus('Ready to scan for questions', 'success');
  });
  
  // Scan Button - Scan current page for questions
  scanBtn.addEventListener('click', async () => {
    await scanPage();
  });
  
  // Answer Button - Get answer from API or saved answers
  answerBtn.addEventListener('click', async () => {
    if (isProcessing) return;
    
    if (!currentQuestion) {
      showStatus('No question found. Click Scan first.', 'error');
      return;
    }
    
    isProcessing = true;
    answerBtn.disabled = true;
    showStatus('Getting answer...', 'info');
    
    try {
      // Check if we already have answer saved
      if (savedAnswers.has(currentQuestion)) {
        const answer = savedAnswers.get(currentQuestion);
        displayAnswer(answer, true);
        showStatus('Using saved answer', 'success');
      } else {
        // Get answer from API
        const apiKey = apiKeyInput.value.trim();
        const answer = await getAnswerFromAPI(currentQuestion, currentAnswers, apiKey);
        
        if (answer) {
          // Save answer for future use
          savedAnswers.set(currentQuestion, answer);
          chrome.storage.local.set({
            savedAnswers: JSON.stringify(Array.from(savedAnswers.entries()))
          });
          
          displayAnswer(answer);
          showStatus('Answer retrieved from API', 'success');
        }
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      isProcessing = false;
      answerBtn.disabled = false;
    }
  });
  
  // Clear Button - Clear saved answers
  clearBtn.addEventListener('click', () => {
    savedAnswers.clear();
    chrome.storage.local.remove('savedAnswers');
    answersList.innerHTML = '';
    showStatus('Saved answers cleared', 'info');
  });
  
  // Save API key on change
  apiKeyInput.addEventListener('change', (e) => {
    chrome.storage.local.set({ apiKey: e.target.value });
    showStatus('API key saved', 'success');
  });
  
  // Function to scan page for questions
  async function scanPage() {
    showStatus('Scanning page...', 'info');
    
    try {
      const response = await sendMessageToContent({
        action: 'SCAN_QUESTIONS'
      });
      
      if (response && response.questions) {
        // For now, just show the first question
        if (response.questions.length > 0) {
          const firstQuestion = response.questions[0];
          currentQuestion = firstQuestion.question;
          currentAnswers = firstQuestion.answers || [];
          
          // Display question
          questionDisplay.textContent = currentQuestion;
          questionDisplay.style.display = 'block';
          
          // Clear previous answers
          answersList.innerHTML = '';
          
          // Display available answers if any
          if (currentAnswers.length > 0) {
            const answersHeader = document.createElement('div');
            answersHeader.className = 'answers-header';
            answersHeader.textContent = 'Possible Answers:';
            answersList.appendChild(answersHeader);
            
            currentAnswers.forEach((answer, index) => {
              const answerEl = document.createElement('div');
              answerEl.className = 'answer-item';
              answerEl.textContent = `${index + 1}. ${answer}`;
              answersList.appendChild(answerEl);
            });
          }
          
          // Check if we have saved answer
          if (savedAnswers.has(currentQuestion)) {
            const answerEl = document.createElement('div');
            answerEl.className = 'saved-answer';
            answerEl.textContent = `Saved Answer: ${savedAnswers.get(currentQuestion)}`;
            answersList.appendChild(answerEl);
          }
          
          showStatus(`Found ${response.questions.length} question(s)`, 'success');
        } else {
          showStatus('No questions found on this page', 'warning');
        }
      }
    } catch (error) {
      showStatus(`Scan failed: ${error.message}`, 'error');
    }
  }
  
  // Function to get answer from DeepSeek API
  async function getAnswerFromAPI(question, answers, apiKey) {
    showStatus('Calling DeepSeek API...', 'info');
    
    // Prepare the prompt
    let prompt = `Question: ${question}\n\n`;
    
    if (answers && answers.length > 0) {
      prompt += `Possible answers:\n`;
      answers.forEach((answer, index) => {
        prompt += `${index + 1}. ${answer}\n`;
      });
      prompt += `\nPlease select the correct answer (just the answer text, no explanation).`;
    } else {
      prompt += `Please provide the correct answer concisely.`;
    }
    
    // Call DeepSeek API
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || 'No answer received';
      
    } catch (error) {
      throw new Error(`API call failed: ${error.message}`);
    }
  }
  
  // Function to display answer
  function displayAnswer(answer, isSaved = false) {
    // Clear previous answers
    answersList.innerHTML = '';
    
    // Display question
    const questionEl = document.createElement('div');
    questionEl.className = 'question-display';
    questionEl.textContent = `Q: ${currentQuestion}`;
    answersList.appendChild(questionEl);
    
    // Display answer
    const answerEl = document.createElement('div');
    answerEl.className = isSaved ? 'saved-answer' : 'api-answer';
    answerEl.textContent = `✅ Answer: ${answer}`;
    answersList.appendChild(answerEl);
    
    // Add auto-fill button
    const fillBtn = document.createElement('button');
    fillBtn.className = 'fill-btn';
    fillBtn.textContent = 'Auto-fill Answer';
    fillBtn.addEventListener('click', () => autoFillAnswer(answer));
    answersList.appendChild(fillBtn);
  }
  
  // Function to auto-fill answer on page
  async function autoFillAnswer(answer) {
    showStatus('Filling answer...', 'info');
    
    try {
      const response = await sendMessageToContent({
        action: 'FILL_ANSWER',
        data: { answer }
      });
      
      if (response && response.success) {
        showStatus('Answer filled successfully!', 'success');
      } else {
        showStatus('Failed to fill answer', 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    }
  }
  
  // Helper function to send message to content script
  function sendMessageToContent(message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    });
  }
  
  // Function to show status messages
  function showStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `status status-${type}`;
    
    // Auto-hide success/info messages after 3 seconds
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (statusEl.textContent === message) {
          statusEl.className = 'status';
        }
      }, 3000);
    }
  }
});
