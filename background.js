async function askAI(prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_API_KEY"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await res.json();
  return data.choices[0].message.content;
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "ask") {
    askAI(req.prompt).then(answer => sendResponse({ answer }));
    return true; // keep channel open
  }
});
