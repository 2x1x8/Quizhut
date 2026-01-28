// Store for previously answered questions
let answerHistory = new Map(JSON.parse(localStorage.getItem("cheat") || "[]"));
let currentQuestions = [];
console.log('v2')
const textBox = document.querySelector('#tinymce, p');
// Function to extract all questions from the page
function extractAllQuestions() {
  const questions_elements = document.querySelectorAll(".question");
  const questions = Array.from(questions_elements, q => ({
    text: q.querySelector(".question_text").innerText,
    element: q,
    answers: Array.from(q.querySelectorAll(".answer"), a => ({
      text: a.innerText,
      element: a,
      input: a.querySelector('input[type="radio"], input[type="checkbox"]')
    }))
  }));
  
  return questions;
}

// Helper function to get full text including nested elements


// Helper function to get answer text


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
    sendResponse({ 
      instruction: document.querySelector("#quiz-instructions ")?.innerText || "",
      questions: simplified });
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
