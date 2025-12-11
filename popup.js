// popup.js - robust version for AI Answer Helper

const sendBtn = document.getElementById("send");
const promptEl = document.getElementById("prompt");
const outputEl = document.getElementById("output");

if (!sendBtn || !promptEl || !outputEl) {
  console.error("popup.js: missing required DOM elements (send, prompt, output).");
} else {
  sendBtn.addEventListener("click", async () => {
    const userPrompt = promptEl.value.trim();

    if (!userPrompt) {
      outputEl.innerText = "Please enter a question.";
      return;
    }

    outputEl.innerText = "Thinking...";

    try {
      // Wrap callback-style chrome.runtime.sendMessage in a Promise and surface chrome.runtime.lastError
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "ask", prompt: userPrompt }, (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(resp);
        });
      });

      // Defensive: response may be undefined or missing .answer
      outputEl.innerText = response && response.answer
        ? response.answer
        : "No answer received from background script.";

    } catch (err) {
      outputEl.innerText = "Error: " + (err && err.message ? err.message : String(err));
      console.error("popup.js sendMessage error:", err);
    }
  });
}
