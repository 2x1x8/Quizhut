let currentQuestions = [];
let questionPayloads = [];
let answers = [];
let instruction = "";
const ANSWER_SELECTOR = {
  MCQ: (q, ans) => {
    ans = parseInt(ans)
    q.answers[ans - 1].input.click()
  },
  checkBox: (q, ans) => {
    ans = JSON.parse(ans);
    q.answers.forEach((a)=>{
      a.input.checked = false
    });
    ans.forEach((a) =>{
      a = parseInt(a)
      q.answers[a - 1].input.click()
    });
  },
  other: (q, ans) => {}
}
const PAYLOAD_BUILDER = {
      MCQ: (q) => ({
          type: "MCQ",
          question: q.text,
          answers: q.answers.map(a => a.text),
          prompt: q.prompt
        }),
      checkBox: (q) => ({
          type: "checkBox",
          question: q.text,
          answers: q.answers.map(a => a.text),
          prompt: q.prompt
        }),
      other: (q) => ({
          type: "other",
          question: q.text,
          answers: q.answers.map(a => a.text),
          prompt: q.prompt
        }),
};
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
            prompt: `Quiz question: "${q.querySelector(".question_text").innerText}". Available answers: ${Array.from(q.querySelectorAll(".answer"), a => a.innerText)}. Provide only the correct index of the answer, NOT THE ANSWER ITSELF (numbers like 1,2,3).`
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
        prompt: `Quiz question: "${q.querySelector(".question_text").innerText}". Available answers: ${Array.from(q.querySelectorAll(".answer"), a => a.innerText)}. Provide one or multiple correct index of the answer, NOT THE ANSWER ITSELF (like [1,2]; [3]; [1,3,4]) in square brackets like [1,2].`
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
        })),    
        prompt: `Quiz question: "${q.querySelector(".question_text").innerText}".`      
    };
  }
};
function questionFactory(q) {
  if (q.querySelectorAll('input[type="radio"]').length > 0) return QUESTION_BUILDER.MCQ(q);
  else if (q.querySelectorAll('input[type="checkbox"]').length > 0) return QUESTION_BUILDER.checkBox(q);
  return QUESTION_BUILDER.other(q);
}


//---------------------------------------------------QUESTION EXTRACTION AND SELECTION LOGIC------------------------------------------------------------ 

function extractAllQuestions() {
  const questions_elements = document.querySelectorAll(".question");
  const questions = Array.from(questions_elements, q => questionFactory(q));
  if (questions.length === 0) {
    console.log("No questions found on this page.");
  }
  console.log(`Found ${questions.length} question(s)`);
  return questions;
}

// Function to select an answer on the webpage
function selectAnswer(answer) {
  if (currentQuestions) {
    console.log(Array.isArray(answers));
    console.log(answers);
    answer.forEach((ans, index) => {
      var q = currentQuestions[index]
      ANSWER_SELECTOR[q.type](q, ans)
    });
    return true;
  } 
  return false;
}
//---------------------------------------------------LISTENERS-----------------------------------------------------------------

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getQuestions") {
    init();
    sendResponse({instruction: instruction, questions: questionPayloads})
  } else if (request.action === "answerQuestion") {
    answers = request.answer;
    const result = selectAnswer(answers);
    sendResponse(result);
  }
  return true;
});

//---------------------------------------------------SEND MESSAGE------------------------------------------------------------
async function init() {
  currentQuestions = extractAllQuestions();
  questionPayloads = currentQuestions.map(q => PAYLOAD_BUILDER[q.type](q));
  instruction = document.querySelector("#quiz-instructions ")?.innerText || "";
  chrome.runtime.sendMessage({
      action: "processItems", 
      instruction: instruction, 
      questions: questionPayloads
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Error sending message:");
        console.error("Message failed:", chrome.runtime.lastError);
        return;
      } else {
        console.log("Questions sent to background script");
      }
  });  
}

init();

