async function askAI(prompt) {
  const apiKey = "sk-2ef0ffd6819a4e71bb135a220a32ac9b"; // ← Put your API key using chrome.storage later

  if (!apiKey) {
    return "Error: API key not found. Set it using chrome.storage.";
  }

  try {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer sk-2ef0ffd6819a4e71bb135a220a32ac9b"
    },
    body: JSON.stringify({
      model: "deepseek-chat",
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
