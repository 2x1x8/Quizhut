let currentQuestions = [];

// Scan page button - now just loads questions without AI processing
document.getElementById("scan").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log(tabs[0]);
    chrome.tabs.sendMessage(tabs[0].id, { action: "scanPage" }, (response) => {
      if (chrome.runtime.lastError) {
        showError("Please refresh the quiz page and try again.");
      } else {
        // After scanning, load the questions to display in GUI
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "getQuestions" }, (response) => {
            if (response?.questions) {
              displayQuestions(response.questions);
              showSuccess(`Loaded ${response.questions.length} question(s)`);
            } else {
              showError("No questions found. Make sure you're on a quiz page.");
            }
          });
        }, 500);
      }
    });
  });
});


// Load questions button
document.getElementById("answerAll").addEventListener("click", () => { 
  console.log(currentQuestions); 
  currentQuestions.forEach((q, index) => { 
    getAIAnswerForQuestion(index);
  }); 
});

// Display questions in the popup
function displayQuestions(questions) {
  currentQuestions = questions;
  const container = document.getElementById("questionsContainer");
  container.innerHTML = "";
  
  if (questions.length === 0) {
    container.innerHTML = "<p>No questions found on this page.</p>";
    return;
  }
  
  questions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question-item";
    questionDiv.innerHTML = `
      <div class="question-header">
        <strong>Question ${index + 1}:</strong>
        <span class="status" id="status${index}">Ready</span>
      </div>
      <div class="question-text">${escapeHtml(q.question)}</div>
      <div class="answers">
        ${q.answers && q.answers.length > 0 ? 
          q.answers.map((a, i) => 
            `<div class="answer-option" data-q="${index}" data-a="${i}">
              <input type="radio" name="q${index}" id="q${index}a${i}">
              <label for="q${index}a${i}">${escapeHtml(a)}</label>
            </div>`
          ).join('') : 
          '<p>No answer options detected</p>'
        }
      </div>
      <div class="ai-answer" id="aiAnswer${index}"></div>
      <div class="btn-group">
        <button class="btn btn-secondary btn-get-answer" data-index="${index}">Get AI Answer</button>
        <button class="btn btn-secondary btn-select-answer" data-index="${index}">Select This Answer</button>
      </div>
    `;
    container.appendChild(questionDiv);
  });
  
  // Add event listeners for get answer buttons
  document.querySelectorAll('.btn-get-answer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      getAIAnswerForQuestion(index);
    });
  });
  
  // Add event listeners for select answer buttons
  document.querySelectorAll('.btn-select-answer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      selectAnswerForQuestion(index);
    });
  });
  
  // Add event listeners for answer selection
  document.querySelectorAll('.answer-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const qIndex = parseInt(e.currentTarget.dataset.q);
      const aIndex = parseInt(e.currentTarget.dataset.a);
      const radio = e.currentTarget.querySelector('input[type="radio"]');
      radio.checked = !radio.checked;
      
      // Update status
      document.getElementById(`status${qIndex}`).textContent = "Selected";
      document.getElementById(`status${qIndex}`).className = "status manual";
    });
  });
}

// Get AI answer for specific question
function getAIAnswerForQuestion(index) {
  const question = currentQuestions[index];
  console.log("abcd");
  if (!question) return;
  document.getElementById(`status${index}`).textContent = "Processing...";
  document.getElementById(`status${index}`).className = "status processing";
  
  const prompt = `Quiz question: "${question.question}". Available answers: ${question.answers?.join(', ') || 'Not specified'}. Provide only the correct answer text or letter.`;
  
  chrome.runtime.sendMessage({ action: "ask", prompt }, (response) => {
    console.log("afg");
    if (response?.answer) {
      document.getElementById(`aiAnswer${index}`).innerHTML = 
        `<strong>AI Answer:</strong> ${response.answer}`;
      document.getElementById(`status${index}`).textContent = "Answered";
      document.getElementById(`status${index}`).className = "status answered";
      
      // Auto-select the matching answer option if found
      const answerText = response.answer.toLowerCase();
      const answerOptions = document.querySelectorAll(`.answer-option[data-q="${index}"]`);
      console.log(answerOptions[0]);
      answerOptions.forEach((option) => {
        const labelText = option.querySelector('label').textContent.toLowerCase();
        if (labelText.includes(answerText) || answerText.includes(labelText)) {
          option.querySelector('input[type="radio"]').checked = true;
          console.log(`selected ${index}`);
          selectAnswerForQuestion(index);
        }
      });
    } else {
      console.log("No answer received from AI");
      document.getElementById(`status${index}`).textContent = "Error";
      document.getElementById(`status${index}`).className = "status error";
    }
  });
}

// Select answer for question on the webpage
function selectAnswerForQuestion(index) {
  const question = currentQuestions[index];
  if (!question) return;
  
  // Find selected answer
  const selectedOption = document.querySelector(`input[name="q${index}"]:checked`);
  if (!selectedOption) {
    console.log("No answer selected");
    return;
  }
  
  const aIndex = parseInt(selectedOption.parentElement.dataset.a);
  const answer = question.answers[aIndex];
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "answerQuestion",
      questionIndex: index,
      answer: answer
    }, (response) => {
      if (response?.success) {
        document.getElementById(`status${index}`).textContent = "Submitted";
        document.getElementById(`status${index}`).className = "status answered";
      } else {
        showError("Failed to submit answer");
      }
    });

    
  });
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for updates from background/content scripts
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "updateQuestions") {
    // This is called when questions are auto-answered
    updateQuestionsDisplay(request.questions);
  } else if (request.action === "updateAnswer") {
    updateAnswerDisplay(request.questionIndex, request.answer);
  } else if (request.action === "processingProgress") {
    updateProgress(request.current, request.total, request.question, request.answer);
  }
});

// Helper functions
function updateQuestionsDisplay(questions) {
  const container = document.getElementById("questionsContainer");
  container.innerHTML = "";
  
  questions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question-item";
    questionDiv.innerHTML = `
      <div class="question-header">
        <strong>Q${index + 1}:</strong>
        <span class="status ${q.cached ? 'cached' : 'processing'}">
          ${q.cached ? 'Cached' : 'Processing...'}
        </span>
      </div>
      <p>${q.question.substring(0, 120)}...</p>
      <div class="answer-display">
        <strong>Answer:</strong> ${q.answer}
      </div>
    `;
    container.appendChild(questionDiv);
  });
}

function updateAnswerDisplay(index, answer) {
  const statusEl = document.getElementById(`status${index}`);
  const answerEl = document.getElementById(`aiAnswer${index}`);
  
  if (statusEl) {
    statusEl.textContent = "Answered";
    statusEl.className = "status answered";
  }
  
  if (answerEl) {
    answerEl.innerHTML = `<strong>AI Answer:</strong> ${answer}`;
  }
}

function updateProgress(current, total, question, answer) {
  console.log(`Processed ${current}/${total}: ${answer}`);
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  errorDiv.style.cssText = "background: #fee; color: #c00; padding: 10px; margin: 10px 0; border-radius: 4px;";
  
  const output = document.getElementById("output");
  output.innerHTML = "";
  output.appendChild(errorDiv);
  
  setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.textContent = message;
  successDiv.style.cssText = "background: #dfd; color: #080; padding: 10px; margin: 10px 0; border-radius: 4px;";
  
  const output = document.getElementById("output");
  output.innerHTML = "";
  output.appendChild(successDiv);
  
  setTimeout(() => successDiv.remove(), 3000);
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup loadd");
  // Always show main section since API key is hardcoded
  document.querySelector('.api-status').style.display = 'block';
  
  // Check if we're on a quiz page by scanning for questions
  setTimeout(() => {
    console.log("Checking for quiz questions on page...");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getQuestions" }, (response) => {
        if (response?.questions && response.questions.length > 0) {
          console.log("Quiz questions detected on page");
          displayQuestions(response.questions);
        }
      });
    });
  }, 500);
});
