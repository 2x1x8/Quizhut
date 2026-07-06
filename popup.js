let currentQuestions = [];
let instruction = "";
document.getElementById("scan").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) { showError("No active tab found."); return; }
    chrome.tabs.sendMessage(tabs[0].id, { action: "getQuestions" }, (response) => {
      if (chrome.runtime.lastError) {
        showError("Cannot reach page. Try refreshing the quiz page.");
        return;
      }
      if (response && response.questions && response.questions.length > 0) {
        displayQuestions(response.questions);
        showSuccess("Loaded " + response.questions.length + " question(s)");
      } else {
        showError("No questions found. Make sure you are on a quiz page.");
      }
    });
  });
});


// Load questions button
document.getElementById("answerAll").addEventListener("click", () => { 
  console.log(currentQuestions); 
  getAIAnswerForQuestion();
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
    console.log(q.question)
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

// Get AI answers for all questions and apply them to the page
function getAIAnswerForQuestion() {
  console.log("Requesting AI answers...");

  currentQuestions.forEach((_, index) => {
    const statusEl = document.getElementById("status" + index);
    if (statusEl) { statusEl.textContent = "Processing"; statusEl.className = "status processing"; }
  });

  chrome.runtime.sendMessage({ action: "ask" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Background error:", chrome.runtime.lastError.message);
      currentQuestions.forEach((_, index) => {
        const statusEl = document.getElementById("status" + index);
        if (statusEl) { statusEl.textContent = "Error"; statusEl.className = "status error"; }
      });
      showError("AI error: " + chrome.runtime.lastError.message);
      return;
    }

    if (!response || !Array.isArray(response)) {
      console.error("No valid response from background:", response);
      currentQuestions.forEach((_, index) => {
        const statusEl = document.getElementById("status" + index);
        if (statusEl) { statusEl.textContent = "Error"; statusEl.className = "status error"; }
      });
      showError("No answers returned from AI.");
      return;
    }

    // Display answers in popup UI
    currentQuestions.forEach((question, index) => {
      const ans = response[index];
      const answerEl = document.getElementById("aiAnswer" + index);
      const statusEl = document.getElementById("status" + index);
      if (!answerEl || !statusEl) return;
      if (ans != null && ans !== "") {
        answerEl.innerHTML = "<strong>AI Answer:</strong> " + escapeHtml(String(ans));
        statusEl.textContent = "Answered";
        statusEl.className = "status answered";
      } else {
        answerEl.innerHTML = "<em style='color:#c00'>No answer received from AI</em>";
        statusEl.textContent = "Error";
        statusEl.className = "status error";
      }
    });

    // Send answers to content script — fire-and-forget (no callback) to avoid
    // the "message port closed before response" error that a callback causes.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) { showError("Could not find the active quiz tab."); return; }
      chrome.tabs.sendMessage(tabs[0].id, { action: "answerQuestion", answer: response });
      showSuccess("Answers applied to the quiz page!");
      currentQuestions.forEach((_, index) => {
        const statusEl = document.getElementById("status" + index);
        if (statusEl) { statusEl.textContent = "Selected"; statusEl.className = "status selected"; }
      });
    });
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

function showError(msg) {
  let el = document.getElementById('_globalMsg');
  if (!el) {
    el = document.createElement('div');
    el.id = '_globalMsg';
    document.querySelector('.container').prepend(el);
  }
  el.className = 'error-message';
  el.textContent = msg;
  setTimeout(() => { if (el.parentNode) el.remove(); }, 4000);
}

function showSuccess(msg) {
  let el = document.getElementById('_globalMsg');
  if (!el) {
    el = document.createElement('div');
    el.id = '_globalMsg';
    document.querySelector('.container').prepend(el);
  }
  el.className = 'success-message';
  el.textContent = msg;
  setTimeout(() => { if (el.parentNode) el.remove(); }, 3000);
}


// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Always show main section since API key is hardcoded
  document.querySelector('.api-status').style.display = 'block';
  
  // Check if we're on a quiz page by scanning for questions
  setTimeout(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getQuestions" }, (response) => {
        console.log(response);
        instruction = response.instruction;
        if (response?.questions && response.questions.length > 0) {
          displayQuestions(response.questions);
        }
      });
    });
  }, 500);
});