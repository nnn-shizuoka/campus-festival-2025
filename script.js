//
// 残り日時表示
//

const counter = document.getElementById('counter');

// 日本標準時 (UTC+9)
const JST = +9;
// 2025年9月20日
const eventTimestamp = Date.UTC(2025, 8, 20, -JST);
const remainingDays = Math.ceil((eventTimestamp - Date.now()) / (24 * 60 * 60 * 1000));

if (remainingDays > 0) {
  counter.textContent = `あと${remainingDays}日`;
} else if (remainingDays === 0) {
  counter.textContent = '本日開催！';
} else {
  counter.textContent = '開催終了';
}

//
// 月アニメーション
//

const moon = document.getElementById('moon');
const moonPhase = document.getElementById('moon-phase');

const createMoonPhasePath = (phase, r) => {
  const semicircle = `a ${r} ${r} 0 0 ${Number(phase % 1 < 0.5)} 0 ${r * 2}`;
  const semiEllipse = `a ${r * Math.abs(Math.cos(2 * Math.PI * phase))} ${r} 0 0 ${Number(phase % 0.5 > 0.25)} 0 ${-r * 2}`;
  return `${semicircle} ${semiEllipse}`;
};

let isTicking = false;

const updateMoonPhase = () => {
  if (isTicking) {
    return;
  }

  isTicking = true;

  window.requestAnimationFrame(() => {
    // トップ画像の部分を除く
    const minScrollY = document.documentElement.clientHeight;
    const maxScrollY = document.documentElement.scrollHeight - document.documentElement.clientHeight - 100;
    const scrollYRange = maxScrollY - minScrollY;
    const phase = Math.min(Math.max(window.scrollY - minScrollY, 0), scrollYRange) / scrollYRange;

    moon.style.setProperty('--phase', phase);
    moonPhase.setAttribute('d', `M 64 4 ${createMoonPhasePath(phase, 60)} Z`);

    isTicking = false;
  });
};

updateMoonPhase();
window.addEventListener('scroll', updateMoonPhase);

//
// 餅つき
//

const mochiCountOrigin = 'https://mochi-counter.z3w7b21k.workers.dev';

const clickArea = document.getElementById('mochi-click-area');
const kineElement = document.getElementById('kine');
const mochiCountElement = document.getElementById('mochi-count');
const mochiCountErrorElement = document.getElementById('mochi-count-error');

let globalMochiCount = 0;
let localTemporaryMochiCount = 0;

function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();

  return rect.bottom >= 0
    && rect.right >= 0
    && rect.top <= document.documentElement.clientHeight
    && rect.left <= document.documentElement.clientWidth;
}

const ANIMATION_DURATION = 400;
let previousMochiCount = 0;
let currentAnimationFrame;

function updateMochiCount() {
  if (currentAnimationFrame) {
    window.cancelAnimationFrame(currentAnimationFrame);
  }

  const totalMochiCount = globalMochiCount + localTemporaryMochiCount;
  const mochiCountDifference = totalMochiCount - previousMochiCount;
  previousMochiCount = globalMochiCount + localTemporaryMochiCount;
  const startTimestamp = performance.now();

  const nextFrame = (timestamp) => {
    const relativeTimestamp = timestamp - startTimestamp;

    if (relativeTimestamp >= ANIMATION_DURATION) {
      mochiCountElement.textContent = totalMochiCount;
      return;
    }

    const currentMochiCountDifference = Math.floor(mochiCountDifference * (1 - relativeTimestamp / ANIMATION_DURATION));
    mochiCountElement.textContent = totalMochiCount - currentMochiCountDifference;
    window.requestAnimationFrame(nextFrame);
  };

  window.requestAnimationFrame(nextFrame);
};

async function request(url, init) {
  try {
    const response = await fetch(url, init);

    if (!response.ok) {
      mochiCountErrorElement.textContent = `通信に失敗しました: ${response.status} ${response.statusText}`;
    }

    mochiCountErrorElement.replaceChildren();

    return response;
  } catch (error) {
    mochiCountErrorElement.textContent = `通信に失敗しました: ${error}`;
  }
}

async function refreshGlobalCount() {
  const response = await request(new URL('/current', mochiCountOrigin));
  globalMochiCount = parseInt(await response.text());
  updateMochiCount();
}

let addTimeoutId = null;
let refreshTimeout = null;

const REQUEST_INTERVAL = 5000;

clickArea.addEventListener('click', (event) => {
  event.preventDefault();

  localTemporaryMochiCount++;
  updateMochiCount();

  // 杵を振り下ろすアニメーション
  kineElement.classList.add('hit');

  // アニメーション終了後にクラスを外す
  kineElement.addEventListener('animationend', () => {
    kineElement.classList.remove('hit');
  }, { once: true });

  // 5秒ごとカウントをアップロード
  if (!addTimeoutId) {
    addTimeoutId = setTimeout(() => {
      addTimeoutId = null;
      const addUrl = new URL('/add', mochiCountOrigin);
      addUrl.searchParams.set('count', localTemporaryMochiCount);

      request(addUrl, { method: 'POST' }).then(async (response) => {
        globalMochiCount = parseInt(await response.text());
        updateMochiCount();
      });

      globalMochiCount += localTemporaryMochiCount;
      localTemporaryMochiCount = 0;
    }, REQUEST_INTERVAL);
  }

  // 最後のクリックから5秒間は更新しない
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  refreshTimeout = setTimeout(() => {
    refreshTimeout = null;
  }, REQUEST_INTERVAL);
});

// 5秒ごと更新
setInterval(() => {
  if (document.hasFocus() && !refreshTimeout && isElementInViewport(clickArea)) {
    refreshGlobalCount();
  }
}, REQUEST_INTERVAL);

// 初期更新
refreshGlobalCount();
