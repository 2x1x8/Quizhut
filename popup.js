let currentQuestions = [];
let instruction = "";
console.log("ngu a")
document.getElementById("scan").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log(tabs[0]);
    chrome.tabs.sendMessage(tabs[0].id, { action: "scanPage" }, (response) => {
      if (chrome.runtime.lastError) {
        showError("Please refresh the quiz page and try again.");
      } else {
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

// Get AI answer for specific question
function getAIAnswerForQuestion(index) {
  const question = currentQuestions[index];
  console.log("abcd");
  if (!question) return;
  
  const prompt = `Quiz question: "${question.question}". Available answers: ${question.answers?.join(', ') || 'Not specified'}. Provide only the correct answer text or letter.`;
  
  chrome.runtime.sendMessage({ action: "ask", instruction: instruction, prompt: prompt }, (response) => {
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



// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Always show main section since API key is hardcoded
  document.querySelector('.api-status').style.display = 'block';
  
  // Check if we're on a quiz page by scanning for questions
  setTimeout(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getQuestions" }, (response) => {
        instruction = response.instruction;
        if (response?.questions && response.questions.length > 0) {
          displayQuestions(response.questions);
        }
      });
    });
  }, 500);
});
