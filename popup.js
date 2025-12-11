document.getElementById("send").addEventListener("click", () => {
  const prompt = document.getElementById("prompt").value;

  chrome.runtime.sendMessage({ action: "ask", prompt }, (response) => {
    document.getElementById("output").innerText = response.answer;
  });
});
