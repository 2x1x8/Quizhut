// Store for API key and quiz data
// REPLACE THIS WITH YOUR ACTUAL DEEPSEEK API KEY
let apiKey = "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"; // Replace sk-your-actual-api-key-here
let quizQuestions = [];

// API key is hardcoded, no need to load from storage

async function askAI(prompt) {
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
            content: "You are a quiz assistant. Answer questions concisely and accurately. For multiple choice, provide just the letter or exact answer text." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });

    const data = await res.json();

    if (!data.choices || !data.choices[0]) {
      console.error("API Error:", data);
      return "Error: " + (data.error?.message || "Unknown API error");
    }

    return data.choices[0].message.content.trim();

  } catch (err) {
    console.error("Network error:", err);
    return "Network error: " + err.message;
  }
}

// Process quiz questions
async function processQuizQuestions(questions) {
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    return questions.map(() => "API key not configured. Please edit background.js");
  }

  const answers = [];
  
  // Process questions in batches to avoid rate limits
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const prompt = `Answer this quiz question concisely: "${question}". If it's multiple choice, just provide the correct letter or exact answer text.`;
    
    try {
      const answer = await askAI(prompt);
      answers.push(answer);
      
      // Notify popup of progress
      chrome.runtime.sendMessage({
        action: "processingProgress",
        current: i + 1,
        total: questions.length,
        question: question,
        answer: answer
      });
      
      // Delay between requests to avoid rate limiting
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      answers.push("Error processing question");
    }
  }
  
  return answers;
}

// Message listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "ask") {
    askAI(req.prompt).then(answer => sendResponse({ answer }));
    return true;
  } else if (req.action === "processQuiz") {
    processQuizQuestions(req.questions).then(answers => {
      sendResponse({ answers });
    });
    return true;
  } else if (req.action === "getApiKeyStatus") {
    sendResponse({ hasApiKey: !!(apiKey && apiKey !== "YOUR_API_KEY_HERE") });
  }
  return true;
});
