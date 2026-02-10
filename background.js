let apiKey = "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"; // Replace sk-your-actual-api-key-here
let quizQuestions = [];

async function askAI(instruction, prompt) {
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
            content: `You are a quiz assistant. Provide the index of correct answer text (for example: 5, 6,...). If no answer is provided, provide your own answer. ${instruction}`

          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    const data = await res.json();
    console.log("AI Response:", data.choices[0].message.content.trim());
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

function sendAnsToContent(ans) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "answerQuestion",
      questionIndex: index,
      answer: JSON.parse(ans)
    });
  })
}

// Message listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "ask") {
    console.log("fdsafdasddsfadsaff", req)
    askAI(req.instruction, req.prompt).then(answer => {
      sendResponse({ answer });
      sendAnsToContent(answer);
    });
    return true;
  } 
  return true;
});
