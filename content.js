// Content script: listens for messages and scans the page DOM to extract questions and choices.
// Uses heuristics similar to the Puppeteer script.

(function () {
  // Default selectors and options
  const DEFAULT = {
    questionSelector: '.question, .quiz-question, [data-question]',
    questionTextSelector: 'h1,h2,h3,h4,.question-text,.qtext',
    choiceSelector: '.choice, .option, li[data-choice], .answer, .quiz-option',
    choiceTextSelector: 'label, .choice-text, .option-text, span, div',
    correctClass: 'correct',
  };

  function textOf(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
  }

  function detectChoiceItems(questionEl, cSel) {
    let items = Array.from(questionEl.querySelectorAll(cSel));
    if (items.length) return items;

    // radio/checkbox inputs -> get associated labels or nearby parent
    const inputs = Array.from(questionEl.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
    if (inputs.length) {
      const found = inputs.map(inp => {
        const id = inp.id;
        if (id) {
          const lab = questionEl.querySelector(`label[for="${id}"]`);
          if (lab) return lab;
        }
        return inp.closest('label') || inp.parentElement || inp;
      });
      return found;
    }

    // list items
    const lis = Array.from(questionEl.querySelectorAll('li'));
    if (lis.length) return lis;

    // fallback: direct children
    return Array.from(questionEl.children || []);
  }

  function scanPage(cfg = {}) {
    const c = Object.assign({}, DEFAULT, cfg || {});
    const qSel = c.questionSelector;
    const qTextSel = c.questionTextSelector;
    const cSel = c.choiceSelector;
    const cTextSel = c.choiceTextSelector;
    const corrClass = c.correctClass;

    let questionEls = Array.from(document.querySelectorAll(qSel));
    if (!questionEls.length) {
      // fallback: try to find headers followed by lists
      const alt = Array.from(document.querySelectorAll('h2, h3, h4')).filter(h => {
        const next = h.nextElementSibling;
        return next && (next.querySelector && next.querySelector('li, input[type="radio"], .choice, .option'));
      });
      if (alt.length) questionEls.push(...alt.map(h => h.parentElement || h));
    }

    const out = questionEls.map(qEl => {
      let qTextEl = null;
      if (qTextSel) qTextEl = qEl.querySelector(qTextSel);
      qTextEl = qTextEl || qEl.querySelector('h1,h2,h3,h4,.question-text,.qtext') || qEl;
      const questionText = textOf(qTextEl);

      const choiceEls = detectChoiceItems(qEl, cSel);
      const choices = choiceEls.map(ch => {
        let choiceTextEl = null;
        if (cTextSel && ch.querySelector) choiceTextEl = ch.querySelector(cTextSel);
        const text = textOf(choiceTextEl) || textOf(ch);

        let isCorrect = false;
        try {
          if (ch.classList && ch.classList.contains(corrClass)) isCorrect = true;
          const attr = (ch.getAttribute && (ch.getAttribute('data-correct') || ch.getAttribute('data-is-correct') || ch.getAttribute('data-iscorrect')));
          if (!isCorrect && attr) {
            const v = String(attr).toLowerCase();
            if (v === 'true' || v === '1' || v === 'yes') isCorrect = true;
          }
          const inp = ch.querySelector && ch.querySelector('input[type="radio"], input[type="checkbox"]');
          if (!isCorrect && inp && (inp.checked || inp.getAttribute('checked') !== null)) isCorrect = true;
          const ariaChecked = ch.getAttribute && (ch.getAttribute('aria-checked') || ch.getAttribute('aria-selected'));
          if (!isCorrect && ariaChecked && String(ariaChecked).toLowerCase() === 'true') isCorrect = true;
          if (!isCorrect && ch.querySelector && ch.querySelector('.' + corrClass)) isCorrect = true;
        } catch (e) {
          // ignore
        }

        return { text: text || null, isCorrect };
      });

      return { question: questionText || null, choices };
    });

    return { url: location.href, scannedAt: new Date().toISOString(), results: out };
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'scan') {
      try {
        const resp = scanPage(msg.config || null);
        sendResponse(resp);
      } catch (err) {
        sendResponse({ error: String(err) });
      }
      // indicate we will sendResponse synchronously
      return true;
    }
    // ignore other messages
  });

  // Optionally expose a global function for debugging in console
  window.__quizScanner = {
    scan: (cfg) => scanPage(cfg)
  };
})();
