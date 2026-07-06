let apiKey = "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"; // Replace sk-your-actual-api-key-here
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
  console.log("Asking AI with instruction:", instruction);
  console.log("Asking AI with prompt:", prompt);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { 
            role: "system", 
            content: `You are a quiz assistant. Provide the correct answer. ${instruction}`

          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2048
      })
    });

    const data = await res.json();
    
    if (!data.choices || !data.choices[0]) {
      console.error("API Error:", data);
      return "Error: " + (data.error?.message || "Unknown API error");
    }
    console.log("AI Response:", data.choices[0].message.content.trim());
    return data.choices[0].message.content.trim();

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
