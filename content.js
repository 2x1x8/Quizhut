// Store for previously answered questions
let answerHistory = new Map(JSON.parse(localStorage.getItem("cheat") || "[]"));
let currentQuestions = [];

// Function to extract all questions from the page
function extractAllQuestions() {
  const questions_elements = document.querySelectorAll(".question");
  const questions = Array.from(questions_elements, q => ({
    id: q.querySelector(".question_name").innerText.slice(9),
    question: q.querySelector(".question_text").innerText,
    element: q,
    answers: Array.from(q.querySelectorAll(".answer"), a => (a.innerText))
  }));
  
  return questions;
}

// Helper function to get full text including nested elements
function getFullText(element) {
  if (!element) return '';
  
  // Clone to avoid modifying original
  const clone = element.cloneNode(true);
  
  // Remove script and style elements
  clone.querySelectorAll('script, style').forEach(el => el.remove());
  
  // Get text content
  return clone.textContent || clone.innerText || '';
}

// Helper function to get answer text
function getAnswerText(element) {
  if (!element) return '';
  
  // If it's an input element, get the label text
  if (element.type === 'radio' || element.type === 'checkbox') {
    // Try to find associated label
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return getFullText(label).trim();
    }
    
    // Try next sibling label
    let sibling = element.nextElementSibling;
    while (sibling) {
      if (sibling.tagName === 'LABEL') {
        return getFullText(sibling).trim();
      }
      sibling = sibling.nextElementSibling;
    }
    
    // Try parent element
    if (element.parentElement.tagName === 'LABEL') {
      return getFullText(element.parentElement).replace(getFullText(element), '').trim();
    }
    
    return '';
  }
  
  // If it's already a label or other element
  return getFullText(element).trim();
}

// Function to scan page and extract questions (without auto-answering)
function scanPageForQuestions() {
  currentQuestions = extractAllQuestions();
  
  if (currentQuestions.length === 0) {
    console.log("No questions found on this page.");
    return { success: false, message: "No questions found" };
  }
  
  console.log(`Found ${currentQuestions.length} question(s)`);
  return { success: true, count: currentQuestions.length };
}

// Function to select an answer on the webpage
function selectAnswer(questionIndex, answerText) {
  if (!currentQuestions[questionIndex]) {
    return { success: false, message: "Question not found" };
  }
  
  const question = currentQuestions[questionIndex];
  const answer = question.answers.find(a => 
    a.text.toLowerCase().includes(answerText.toLowerCase()) ||
    answerText.toLowerCase().includes(a.text.toLowerCase())
  );
  
  if (answer && answer.input) {
    answer.input.click();
    answer.input.checked = true;
    
    // Trigger change event if needed
    const event = new Event('change', { bubbles: true });
    answer.input.dispatchEvent(event);
    
    console.log(`Answered: ${question.text.substring(0, 50)}... -> ${answerText}`);
    return { success: true };
  } else if (answer && answer.element) {
    answer.element.click();
    console.log(`Answered via element: ${question.text.substring(0, 50)}... -> ${answerText}`);
    return { success: true };
  }
  
  return { success: false, message: "Could not find answer element" };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanPage") {
    const result = scanPageForQuestions();
    sendResponse(result);
  } else if (request.action === "getQuestions") {
    currentQuestions = extractAllQuestions();
    const simplified = currentQuestions.map(q => ({
      question: q.text,
      answers: q.answers.map(a => a.text)
    }));
    sendResponse({ questions: simplified });
  } else if (request.action === "answerQuestion") {
    const { questionIndex, answer } = request;
    const result = selectAnswer(questionIndex, answer);
    if (result.success) {
      answerHistory.set(currentQuestions[questionIndex].text, answer);
      localStorage.setItem("cheat", JSON.stringify(Array.from(answerHistory.entries())));
    }
    sendResponse(result);
  }
  return true;
});

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      // Just extract questions without auto-answering
      currentQuestions = extractAllQuestions();
      if (currentQuestions.length > 0) {
        console.log(`Page loaded with ${currentQuestions.length} question(s)`);
      }
    }, 1000);
  });
} else {
  setTimeout(() => {
    currentQuestions = extractAllQuestions();
    if (currentQuestions.length > 0) {
      console.log(`Page loaded with ${currentQuestions.length} question(s)`);
    }
  }, 500);
}
