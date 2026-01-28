export const VEHICLE_BUILDERS = {
  MCQ(q) {
    return {
            text: q.querySelector(".question_text").innerText,
            element: q,
            answers: Array.from(q.querySelectorAll(".answer"), a => ({
                text: a.innerText,
                element: a,
                input: a.querySelector('input[type="radio"]')
            }))
        };
  },

  checkBox(el) {
    return {
        text: q.querySelector(".question_text").innerText,
        element: q,
        answers: Array.from(q.querySelectorAll(".answer"), a => ({
            text: a.innerText,
            element: a,
            input: a.querySelector('input[type="checkbox"]')
        }))
    };
    },

  ship(el) {
    return {
      type: "ship",
      registrationNumber: el.querySelector(".reg").textContent.trim(),
      owner: el.querySelector(".owner").textContent.trim(),
      details: {
        tonnage: Number(el.querySelector(".tonnage").textContent),
        length: Number(el.querySelector(".length").textContent),
        crew: Number(el.querySelector(".crew").textContent)
      }
    };
  }
};
