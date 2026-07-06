let currentQuestions = [];
let questionPayloads = [];
let answers = [];
let instruction = "";

const TYPE_MAP = {
  multiple_choice_question: "mcq",
  true_false_question: "mcq",
  multiple_answers_question: "checkbox",
  matching_question: "matching",
  essay_question: "text_entry",
  fill_in_multiple_blanks_question: "text_entry"
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
        if (ans == null) return;
        const idx = extractAnswerIndex(String(ans), this.answers.length);
        if (idx === null) { console.warn("MCQ select: could not parse index from:", ans); return; }
        this.answers[idx - 1].input.click();
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
          if (ans == null) return;
          let indices;
          try {
            // Handle both "[1,2]" and "1,2" forms
            const cleaned = String(ans).replace(/[^\d,]/g, '').trim();
            indices = cleaned ? cleaned.split(',').map(Number).filter(n => !isNaN(n) && n >= 1) : [];
            if (!indices.length) indices = JSON.parse(ans);
          } catch(e) {
            console.warn('checkbox select: could not parse AI answer:', ans);
            return;
          }
          this.answers.forEach((a) => a.input.checked = false);
          indices.forEach((a) => {
            if (a >= 1 && a <= this.answers.length) this.answers[a - 1].input.click();
          });
        }
      }
  },

  matching(q){
    const text = q.querySelector(".question_text").innerText
    const questions = Array.from(q.querySelectorAll(".answer"), a => ({
        text: a.querySelector('label').innerText,
        input: a.querySelector('select')
    }))
    const selectEl = q.querySelector("select");
    const answers = selectEl
      ? Array.from(selectEl.querySelectorAll("option"), a => ({
          text: a.innerText,
          value: a.value,
          element: a
        })).filter(a => a.value)
      : [];
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
          if (ans == null) return;
          let indices;
          try {
            indices = JSON.parse(ans);
          } catch(e) {
            // Try extracting raw numbers from something like "[2341,1242]"
            const nums = String(ans).match(/\d+/g);
            if (!nums) { console.warn('matching select: could not parse AI answer:', ans); return; }
            indices = nums.map(Number);
          }
          indices.forEach((a, i) => {
            if (i < this.questions.length) this.questions[i].input.value = a;
          });
        }
      }
    },
  text_entry(q){
    const text = q.querySelector(".question_text").innerText;
    const rawType = q.querySelector('.question_type').textContent.trim();
    const isEssay = rawType === 'essay_question';

    // Plain inputs (short answer, numerical, fill-in-blanks)
    const inputs = Array.from(
      q.querySelectorAll('input[type="text"], input[type="number"]')
    );
    // Hidden textareas (TinyMCE binds to these; Canvas reads them on submit)
    const textareas = Array.from(q.querySelectorAll('textarea'));

    const prompt = isEssay
      ? `Essay question: "${text}". Write a thorough, well-structured response with detailed explanations and examples. Use multiple paragraphs and cover all key aspects of the topic completely.`
      : inputs.length > 1
        ? `Fill-in-the-blank question: "${text}". There are ${inputs.length} blank(s) to fill. Provide exactly ${inputs.length} answers separated by " | " in order. Example: "answer1 | answer2". Only the answers, nothing else.`
        : `Quiz question: "${text}". Provide only the exact correct answer as plain text — no explanation, no extra words.`;

    return {
      type: "text_entry",
      text: text,
      element: q,
      answers: [],   // no predefined choices; keeps buildPayload safe
      inputs: inputs,
      prompt: prompt,
      select(ans){
        if (ans == null) return;
        const ansText = String(ans).trim();

        if (isEssay) {
          // 1. Try to write directly into the TinyMCE iframe body (visible editor)
          const frames = Array.from(q.querySelectorAll('iframe'));
          let wroteToFrame = false;
          for (const frame of frames) {
            try {
              const doc = frame.contentDocument || frame.contentWindow?.document;
              if (doc && doc.body) {
                // Preserve newlines as <br> in the visual editor
                doc.body.innerHTML = ansText.replace(/\n/g, '<br>');
                wroteToFrame = true;
                break;
              }
            } catch(e) { /* cross-origin frame — skip */ }
          }
          // 2. Always set the hidden textarea so Canvas form submission captures the answer
          textareas.forEach(ta => {
            ta.value = ansText;
            ta.dispatchEvent(new Event('input',  { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
          });
          if (wroteToFrame || textareas.length > 0) return;
        }

        // Short answer / numerical (single input)
        if (inputs.length === 1) {
          const el = inputs[0];
          el.focus();
          el.value = ansText;
          el.dispatchEvent(new Event('input',  { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }

        // Fill-in-multiple-blanks (several inputs)
        if (inputs.length > 1) {
          const parts = ansText.split('|').map(s => s.trim());
          inputs.forEach((el, i) => {
            el.focus();
            el.value = parts[i] !== undefined ? parts[i] : '';
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });
          return;
        }

        // Last resort: any textarea (e.g. a plain non-TinyMCE essay box)
        textareas.forEach(ta => {
          ta.focus();
          ta.value = ansText;
          ta.dispatchEvent(new Event('input',  { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
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
          prompt: `Quiz question: "${q.querySelector(".question_text").innerText}".`,
          select(ans){}      
      };
    
  }
};
// Robustly extract a 1-based answer index from an AI response that may be
// a bare number ("2"), a short phrase ("The answer is 2"), or a full verbose
// explanation ("To solve this... 4t = 2a ... The correct answer is: 2").
// Priority: explicit "answer" label > last standalone digit > first digit.
function extractAnswerIndex(ans, numAnswers) {
  const s = String(ans).trim();

  // 1. Bare integer
  const direct = parseInt(s);
  if (!isNaN(direct) && String(direct) === s.replace(/\s/g, '')) return direct;

  // 2. Labelled pattern: "answer is 2", "correct answer: 2", "answer: 2"
  const labelled = s.match(/(?:correct\s+)?answer\s*(?:is\s*)?[:\s]\s*(\d+)/i);
  if (labelled) return parseInt(labelled[1]);

  // 3. Last standalone digit/number in the string (most likely to be the index
  //    at the end of an explanation like "...so the answer is 2")
  const allNums = [...s.matchAll(/\b(\d+)\b/g)];
  if (allNums.length > 0) {
    // Walk backwards to find last number that is a valid index
    for (let i = allNums.length - 1; i >= 0; i--) {
      const n = parseInt(allNums[i][1]);
      if (n >= 1 && n <= numAnswers) return n;
    }
    // If none in range, return the last number anyway (range check is in caller)
    return parseInt(allNums[allNums.length - 1][1]);
  }

  return null;  // Could not extract
}

function questionFactory(q) {
  // .trim() is critical: Canvas (and custom quiz pages) often put newlines/spaces
  // inside .question_type.  Without trim(), TYPE_MAP lookup fails → "other" type
  // → select() is a no-op for every question that has surrounding whitespace.
  const rawType = q.querySelector('.question_type').textContent.trim();
  const mappedType = TYPE_MAP[rawType] ?? "other";
  console.log("questionFactory type:", rawType, "->", mappedType);
  return QUESTION_BUILDER[mappedType](q);
};
function buildPayload(q){ 
  return ({
          type: q.type,
          question: q.text,
          answers: (q.answers || []).map(a => a.text),
          prompt: q.prompt
  })
};

//---------------------------------------------------QUESTION EXTRACTION AND SELECTION LOGIC------------------------------------------------------------ 

function extractAllQuestions() {
  const questions_elements = document.querySelectorAll(".question");
  // Use a safe per-element map so a single bad question never aborts the whole
  // array.  Previously, Array.from(elements, mapFn) would throw and leave
  // currentQuestions pointing at a stale shorter array.
  const questions = [];
  questions_elements.forEach((el, i) => {
    try {
      questions.push(questionFactory(el));
    } catch (e) {
      console.error(`extractAllQuestions: questionFactory threw for element ${i}:`, e);
      // Push a safe no-op placeholder so indices stay aligned with the
      // background's quizQuestions array (both built from the same DOM pass).
      questions.push({
        type: "error",
        text: "",
        element: el,
        answers: [],
        prompt: "",
        select() {}
      });
    }
  });
  if (questions.length === 0) {
    console.log("No questions found on this page.");
  }
  console.log(`Found ${questions.length} question(s)`);
  return questions;
}

// Function to select all answer on the webpage
function selectAnswer(answer) {
  if (currentQuestions) {
    answer.forEach((ans, index) => {
      const q = currentQuestions[index];
      if (!q) return;
      try {
        q.select(ans);
      } catch(e) {
        console.error(`selectAnswer failed for question ${index}:`, e);
      }
    });
    return true;
  } 
  return false;
}
//---------------------------------------------------LISTENERS-----------------------------------------------------------------

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "getQuestions") {
      init();
      sendResponse({ instruction: instruction, questions: questionPayloads });

    } else if (request.action === "answerQuestion") {
      answers = request.answer;
      console.log("answers received in content.js:", answers);
      const result = selectAnswer(answers);
      console.log("selectAnswer result:", result);
      sendResponse(result);

    } else {
      sendResponse(null);
    }
  } catch (e) {
    console.error("content.js message handler error:", e);
    try { sendResponse({ error: e.message }); } catch (_) {}
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