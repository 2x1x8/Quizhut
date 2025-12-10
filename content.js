let cheat = new Map(JSON.parse(localStorage.getItem("cheat")));
let Found = false
let anstolet = new Map();
let question = document.querySelector('.question_text').innerText.replace(/\u00A0/g, ' ').trim();
for (let i = 0; i < document.querySelectorAll('input[type="checkbox"]').length
; i++) {
  let answer = document.querySelectorAll('.answer_label')[i].innerText.replace(/\u00A0/g, ' ').trim();
  anstolet.set(answer, document.querySelectorAll('input[type="checkbox"]')[i]);
};
  
if(cheat.get(question) != undefined){
	anstolet.get(cheat.get(question)).click()
    Found = true
} 
if (!Found){
    	cheat.forEach(function(value, key){
            if (key.includes(question)) {
                anstolet.get(value).click()
                Found = true
            }	
        })
}
if (!Found) {
    cheat.forEach(function(value, key){
            if (key.includes(question.slice(2, -2))) {
                anstolet.get(value).click()
                Found = true
            }	
        })
}

