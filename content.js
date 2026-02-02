const QUESTION_BUILDER = {
  MCQ(q) {
    return {
            type: "MCQ",
            text: q.querySelector(".question_text").innerText,
            element: q,
            answers: Array.from(q.querySelectorAll(".answer"), a => ({
                text: a.innerText,
                element: a,
                input: a.querySelector('input[type="radio"]')
            })),
            prompt: `Quiz question: "${question.question}". Available answers: ${question.answers?.join(', ')}. Provide only the correct answer index (numbers like 1,2,3).`
        };
  },

  checkBox(q) {
    return {
        type: "checkBox",
        text: q.querySelector(".question_text").innerText,
        element: q,
        answers: Array.from(q.querySelectorAll(".answer"), a => ({
            text: a.innerText,
            element: a,
            input: a.querySelector('input[type="checkbox"]')
        })),
        prompt: `Quiz question: "${question.question}". Available answers: ${question.answers?.join(', ')}. Provide one or multiple correct answer index (numbers like 1,2,3) in square brackets like [1,2].`
    };
    },
  other(q){
    return {
        type: "other",
        text: q.querySelector(".question_text").innerText,
        element: q,
        answers: Array.from(q.querySelectorAll(".answer"), a => ({
            text: a.innerText,
            element: a,
        }))
    };
  }
};
const serializer = {
  MCQ: currentQuestions.map(q => ({
      question: q.text,
      answers: q.answers.map(a => a.text),
      prompt: q.prompt
    })),
  checkBox: currentQuestions.map(q => ({
      question: q.text,
      answers: q.answers.map(a => a.text),
      prompt: q.prompt
    })),
  other: currentQuestions.map(q => ({
      question: q.text,
      answers: q.answers.map(a => a.text),
      prompt: q.prompt
    })),
};

// Store for previously answered questions
let currentQuestions = [];
console.log('v2')
// Function to extract all questions from the page

 
function questionFactory(q) {
  if (q.querySelectorAll('input[type="radio"]').length > 0) return QUESTION_BUILDER.MCQ(q);
  if (q.querySelectorAll('input[type="checkbox"]').length > 0) return QUESTION_BUILDER.checkBox(q);
  return QUESTION_BUILDER.other(q);
}


function extractAllQuestions() {
  const questions_elements = document.querySelectorAll(".question");
  const questions = Array.from(questions_elements, q => questionFactory(q));
  return questions;
}

// Helper function to get full text including nested elements


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
    sendResponse({ 
      instruction: document.querySelector("#quiz-instructions ")?.innerText || "",
      questions: currentQuestions.map(q => serializer[q.type]?.(q) || q)
  })} else if (request.action === "answerQuestion") {
    const { questionIndex, answer } = request;
    const result = selectAnswer(questionIndex, answer);
    if (result.success) {
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
      console.log(QUESTION_BUILDER.MCQ(document.querySelector(".question")))
      console.log(`Page loaded with ${currentQuestions.length} question(s)`);
    }
  }, 500);
}
