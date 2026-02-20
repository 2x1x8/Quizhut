let currentQuestions = [];
let questionPayloads = [];
let answers = [];
let instruction = "";

const TYPE_MAP = {
  multiple_choice_question: "mcq",
  true_false_question: "mcq",
  multiple_answers_question: "checkbox", 
  matching_question: "matching"
};

const QUESTION_BUILDER = {
  mcq(q){
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
  },

  checkbox(q){
    const text = q.querySelector(".question_text").innerText
    const answers = Array.from(q.querySelectorAll(".answer"), a => ({
        text: a.innerText,
        input: a.querySelector('input[type="checkbox"]')
    }))
    return {
        type: "checkbox",
        text: text,
        element: q,
        answers: answers,
        prompt: `Quiz question: "${text}". Available answers: ${answers.map(a => a.text)}. Provide one or multiple correct index of the answer, NOT THE ANSWER ITSELF (like [1,2]; [3]; [1,3,4]) in square brackets like [1,2].`,
        select(ans){
          ans = JSON.parse(ans);
          this.answers.forEach((a)=>a.input.checked = false);
          ans.forEach((a) =>{
              this.answers[a-1].input.click()
            }
          );
        }
      }
  },

  matching(q){
    const text = q.querySelector(".question_text").innerText
    const questions = Array.from(q.querySelectorAll(".answer"), a => ({
        text: a.querySelector('label').innerText,
        input: a.querySelector('select')
    }))
    const answers = Array.from(q.querySelector("select").querySelectorAll("option"), a => ({
        text: a.innerText,
        value: a.value,
        element: a
    })).filter(a => a.value);
    return {
        type: "matching",
        text: text,
        element: q,
        questions: questions,
        answers: answers,
        prompt:  `This is a matching question, you'll be provided the question text, values on the left and youll have to select the matching value on the right 
                  text:  ${text} 
                  Left values: "${questions.map(q => q.text)}". 
                  Available answers: ${answers.map(a => `(index:${a.value}, answer: ${a.text})`)}. 
                  Provide index of the answer for each left value in square brackets like [2341,1242,3128,5432]. Left values can have same or different answer.
                  example response: "[2341,1242,3128,5432]", "[7751,9576,1643,7284]". Only respond with that, nothing more. Your explanation is not needed`,
        select(ans){
          ans = JSON.parse(ans);
          ans.forEach((a, i) =>{
              this.questions[i].input.value = a
            }
          );
        }
      }
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
          prompt: `Quiz question: "${q.querySelector(".question_text").innerText}".`,
          select(ans){}      
      };
    
  }
};
function questionFactory(q) {
  const rawType = q.querySelector('.question_type').textContent;
  const mappedType = TYPE_MAP[rawType] ?? "other";
  console.log(mappedType)
  return QUESTION_BUILDER[mappedType](q);
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
      const q = currentQuestions[index]
      q.select(ans)
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
  instruction = document.querySelector("#quiz-instructions")?.innerText || "";
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

