const counter = document.getElementById('counter');

// 日本標準時 (UTC+9)
const JST = +9;
// 2025年9月20日
const eventTimestamp = Date.UTC(2025, 8, 20, -JST);
const remainingDays = Math.ceil((eventTimestamp - Date.now()) / (24 * 60 * 60 * 1000));

counter.textContent = `あと${remainingDays}日`;
