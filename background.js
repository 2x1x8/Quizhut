let apiKey = "AQ.Ab8RN6LNXrf0hovwbXpfXWR2pDrFww60-O_UMT6Haw-kRNcuAQ"; // Replace sk-your-actual-api-key-here
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
const statusMessages = {
  200: "OK",
  400: "Bad Request",
  401: "Unauthorized (invalid API key)",
  403: "Forbidden",
  404: "Not Found",
  408: "Request Timeout",
  409: "Conflict",
  413: "Payload Too Large",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable"
};
let quizQuestions = [];
let instruction = "";
let answers = [];
async function askAI(instruction, prompt) {
  const requestBody = {
    system_instruction: {
      parts: [{ text: `You are a quiz assistant. Provide the correct answer. ${instruction}` }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048 
    }
  };
  console.log("Asking AI with instruction:", instruction);
  console.log("Asking AI with prompt:", prompt);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
  });

    const data = await res.json();
    
    //check if response is valid
    if (!data.candidates || !data.candidates[0]) {
      console.error("API Error:", data);
      return "Error: " + (data.error?.message || "Unknown API error");
    }
    let AIresponse = data.candidates[0].content.parts[0].text.trim();
    console.log("AI Response:", AIresponse);
    return AIresponse;

  } catch (err) {
    console.error("Network error:", err);
    return "Network error: " + err.message;
  }
}

async function getAnswers(instruction) {
  return Promise.all(
    quizQuestions.map(async (q) => {
      try {
        return await askAI(instruction, q.prompt);
      } catch (err) {
        console.error("Error asking AI for question:", q, err);
        return null;
      }
    })
  );
};



// Message listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "ask") {
    (async () => {
      console.log("quizQuestions", quizQuestions);
      answers = await getAnswers(instruction);
      console.log("AI answers", typeof answers, answers);
      sendResponse(answers);
    })();
    return true;
  } else if (req.action === "processItems") {
    quizQuestions = req.questions;
    instruction = req.instruction;
  }
  return true;
});
