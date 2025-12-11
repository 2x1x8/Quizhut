async function askAI(prompt) {
  const apiKey = "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"; // ← Put your API key using chrome.storage later

  if (!apiKey) {
    return "Error: API key not found. Set it using chrome.storage.";
  }

  try {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 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"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

    const data = await res.json();

    if (!data.choices) {
      return "API Error: " + JSON.stringify(data);
    }

    return data.choices[0].message.content;

  } catch (err) {
    return "Network error: " + err.message;
  }
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "ask") {
    askAI(req.prompt).then(answer => sendResponse({ answer }));
    return true;
  }
});
