let currentQuestions = [];
let questionPayloads = [];
let answers = [];
let instruction = "";

const QUESTION_BUILDER = {
  mcq:{
    detect: (q) => !!q.querySelector('input[type="radio"]'),
    build(q){
      const text = q.querySelector(".question_text").innerText
      const answers = Array.from(q.querySelectorAll(".answer"), a => ({
          text: a.innerText,
          element: a,
          input: a.querySelector('input[type="radio"]')
      }))
      return {
              type: "mcq",
              text: text,
              element: q,
              answers: answers,
              prompt: `Quiz question: "${text}". Available answers: ${answers.map(a => a.text)}. Provide only the correct index of the answer, NOT THE ANSWER ITSELF (numbers like 1,2,3).`,
              select(ans){
                ans = parseInt(ans)
                this.answers[ans - 1].input.click()
              }
      };
    }
  },

  checkbox:{
    detect: ()=> !!q.querySelector('input[type="checkbox"]'),
    build(q) {
      const text = q.querySelector(".question_text").innerText
      const answers = Array.from(q.querySelectorAll(".answer"), a => ({
          text: a.innerText,
          element: a,
          input: a.querySelector('input[type="radio"]')
      }))
      return {
          type: "checkbox",
          text: q.querySelector(".question_text").innerText,
          element: q,
          answers: Array.from(q.querySelectorAll(".answer"), a => ({
              text: a.innerText,
              element: a,
              input: a.querySelector('input[type="checkbox"]')
          })),
          prompt: `Quiz question: "${text}". Available answers: ${answers.map(a => a.text)}. Provide one or multiple correct index of the answer, NOT THE ANSWER ITSELF (like [1,2]; [3]; [1,3,4]) in square brackets like [1,2].`,
          select(ans){
            ans = JSON.parse(ans);
            this.answers.forEach((a)=>a.input.checked = false);
          }
      }
      }
  },
  other:{
    detect: (q) => {true},
    build(q){
      return {
          type: "other",
          text: q.querySelector(".question_text").innerText,
          element: q,
          answers: Array.from(q.querySelectorAll(".answer"), a => ({
              text: a.innerText,
              element: a,
          })),    
          prompt: `Quiz question: "${q.querySelector(".question_text").innerText}".`,
          select(ans){}      
      };
    }
  }
};
function questionFactory(q) {
  for (let x in QUESTION_BUILDER){
    if (QUESTION_BUILDER[x].detect(q)){
      return QUESTION_BUILDER[x].build(q)
    }
  }
};
function buildPayload(q){ 
  return ({
          type: q.type,
          question: q.text,
          answers: q.answers.map(a => a.text),
          prompt: q.prompt
  })
};

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

// Function to select all answer on the webpage
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
    console.log("answers: ", answers)
    const result = selectAnswer(answers);
    sendResponse(result);
  }
  return true;
});

//---------------------------------------------------SEND MESSAGE------------------------------------------------------------
async function init() {
  currentQuestions = extractAllQuestions();
  questionPayloads = currentQuestions.map(q => buildPayload(q));
  instruction = document.querySelector("#quiz-instructions ")?.innerText || "";
  console.log(questionPayloads)
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

