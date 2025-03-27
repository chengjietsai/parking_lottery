const GAS_URL = "https://script.google.com/macros/s/AKfycbzbbdHuW0L6k4Rf4af63s5kRo7xZOX_BuTVqPbgfnNlcnxpl4ciLNpIis7SwLK9MtMA/exec"


/**
 * Updates the second-choice dropdown with available options excluding the current first choice.
 *
 * This function resets the dropdown with the id "secondChoice" and repopulates it with the choices
 * "甲", "乙", and "丙", omitting the option that matches the value retrieved from the element with the id "firstChoice".
 *
 * @remark The first-choice value is accessed using the property "valua" instead of "value", which may result
 * in unintended behavior if the selection is not properly retrieved.
 */
function updateChoices() {
    const first = document.getElementById("firstChoice").valua;
    const secondChoice = document.getElementById("secondChoice");
    secondChoice.innerHTML = "<option value=''>請選擇</option>";
    ["甲", "乙", "丙"].forEach(option => {
        if (option !== first) {
            secondChoice.innerHTML += `<option value="${option}">${option}</option>`;
        }
    });
}

// 提交表單（改用 text/plain）
document.getElementById('lotteryForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = [
        document.getElementById('address').value,
        document.getElementById('floor').value,
        document.getElementById('firstChoice').value,
        document.getElementById('secondChoice').value,
        new Date().toISOString(),
    ].join(",");

    fetch(GAS_URL + "?action=submit", {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: formData
    })
    .then(response => response.text())
    .then(data => alert("提交成功！"))
    .catch(error => alert("提交失敗，請稍後再試。"));
});

// 檢查重複資料
function checkDuplicates() {
    fetch(GAS_URL + "?action=getData")
    .then(response => response.text())
    .then(text => {
        const data = JSON.parse(text);
        const seen = new Set();
        const duplicates = [];
        data.forEach(entry => {
            const key = entry.address + " 號" + entry.floor+" 樓";
            if (seen.has(key)) {
                duplicates.push(key);
            } else {
                seen.add(key);
            }
        });

        alert(duplicates.length ? `重複資料:\n${duplicates.join("\n")}` : "沒有重複資料！");
    });
}

// 抽籤
function drawLottery() {
    fetch(`${GAS_URL}?action=getData`)
        .then(response => response.json())
        .then(data => {
            const quotas = {
                A: parseInt(document.getElementById('quotaA').value),
                B: parseInt(document.getElementById('quotaB').value),
                C: parseInt(document.getElementById('quotaC').value),
            };

            const latestEntries = {};
            data.forEach(entry => {
                const key = `${entry.address}-${entry.floor}`;
                latestEntries[key] = entry;
            });

            const sortedEntries = Object.values(latestEntries).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            let selected = { A: [], B: [], C: [] };
            let waitingList = { A: [], B: [], C: [] };

            // **第一階段：第一志願抽籤**
            let firstChoiceApplicants = { A: [], B: [], C: [] };
            sortedEntries.forEach(entry => {
                firstChoiceApplicants[convertToABC(entry.firstChoice)].push(entry);
            });

            Object.keys(firstChoiceApplicants).forEach(choice => {
                if (firstChoiceApplicants[choice].length <= quotas[choice]) {
                    selected[choice] = firstChoiceApplicants[choice]; // 全部錄取
                } else {
                    selected[choice] = shuffleArray(firstChoiceApplicants[choice]).slice(0, quotas[choice]); // 超額則抽籤
                    waitingList[choice] = shuffleArray(firstChoiceApplicants[choice]).slice(quotas[choice]); // 未錄取進入第二志願
                }
            });

            // **第二階段：第二志願抽籤**
            let secondChoiceApplicants = { A: [], B: [], C: [] };
            waitingList.A.concat(waitingList.B, waitingList.C).forEach(entry => {
                secondChoiceApplicants[convertToABC(entry.secondChoice)].push(entry);
            });

            Object.keys(secondChoiceApplicants).forEach(choice => {
                let remainingSlots = quotas[choice] - selected[choice].length;
                if (remainingSlots > 0) {
                    selected[choice].push(...shuffleArray(secondChoiceApplicants[choice]).slice(0, remainingSlots));
                }
            });

            updateResults(selected);
        })
        .catch(error => alert("獲取資料失敗"));
}

// 更新抽籤結果
function updateResults(selected) {
    ["A", "B", "C"].forEach(choice => {
        const resultBox = document.getElementById(`result${choice}`);
        resultBox.innerHTML = selected[choice].map(entry => `<div class="result-item">${entry.address} 號 ${entry.floor} 樓</div>`).join("");
    });
}

// 隨機排序
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}


function convertToABC(chineseOption) {
    return { "甲": "A", "乙": "B", "丙": "C" }[chineseOption] || chineseOption;
}

function convertToChinese(abcOption) {
    return { "A": "甲", "B": "乙", "C": "丙" }[abcOption] || abcOption;
}

