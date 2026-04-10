/* ══════════════════════════════════════════
   NUTRITRACK — app.js
   Features: Goal-based macro targets, OpenFoodFacts search,
   Health Score, Meal Time tabs, Donut Chart, Water Tracker,
   Smart Insights, Export Daily Summary
══════════════════════════════════════════ */

'use strict';

// ────────────────────────────────────────────
// CONSTANTS & CONFIG
// ────────────────────────────────────────────

const GOALS = {
    balanced: {
        name: 'Balanced',
        cal: 2000, protein: 50, carbs: 250, fat: 70, sugar: 30, fiber: 30,
        insights: [
            { text: 'Aim for colourful vegetables at every meal', icon: 'fa-carrot', cls: 'accent' },
            { text: 'Keep meals balanced across all macros', icon: 'fa-scale-balanced', cls: '' },
        ]
    },
    weight_loss: {
        name: 'Weight Loss',
        cal: 1500, protein: 80, carbs: 150, fat: 50, sugar: 20, fiber: 35,
        insights: [
            { text: 'High protein keeps you full longer', icon: 'fa-drumstick-bite', cls: 'accent' },
            { text: 'Limit refined carbs and added sugars', icon: 'fa-ban', cls: 'warn' },
            { text: 'Prioritise fibre — it slows digestion', icon: 'fa-seedling', cls: 'accent' },
        ]
    },
    muscle_gain: {
        name: 'Muscle Gain',
        cal: 2500, protein: 150, carbs: 300, fat: 80, sugar: 40, fiber: 30,
        insights: [
            { text: 'Eat protein within 30 min after workout', icon: 'fa-dumbbell', cls: 'accent' },
            { text: 'Complex carbs fuel your training sessions', icon: 'fa-wheat-awn', cls: '' },
            { text: 'Calorie surplus is key — hit your target!', icon: 'fa-fire', cls: 'warn' },
        ]
    },
    diabetic: {
        name: 'Diabetic',
        cal: 1800, protein: 60, carbs: 180, fat: 60, sugar: 10, fiber: 40,
        insights: [
            { text: 'Sugar limit is 10g — watch hidden sugars!', icon: 'fa-droplet', cls: 'danger' },
            { text: 'High fibre foods lower glycaemic impact', icon: 'fa-seedling', cls: 'accent' },
            { text: 'Avoid processed foods and white carbs', icon: 'fa-ban', cls: 'warn' },
        ]
    }
};

const MACRO_CONFIG = [
    { key: 'cal', label: 'Calories', unit: 'kcal', icon: 'fa-fire', color: '#ff8c42', donut: true },
    { key: 'protein', label: 'Protein', unit: 'g', icon: 'fa-drumstick-bite', color: '#b48cf7', donut: true },
    { key: 'carbs', label: 'Carbs', unit: 'g', icon: 'fa-wheat-awn', color: '#ffd166', donut: true },
    { key: 'fat', label: 'Fat', unit: 'g', icon: 'fa-burger', color: '#ff5757', donut: true },
    { key: 'sugar', label: 'Sugar', unit: 'g', icon: 'fa-cubes-stacked', color: '#f472b6', donut: false },
    { key: 'fiber', label: 'Fiber', unit: 'g', icon: 'fa-seedling', color: '#34d399', donut: false },
];

const MEAL_TIMES = ['breakfast', 'lunch', 'dinner', 'snack'];

// ────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────

let state = {
    goal: 'balanced',
    mealLog: [],          // { id, name, macros:{cal,protein,carbs,fat,sugar,fiber}, mealTime, score }
    waterGlasses: 0,
    activeTab: 'all',
    pendingFood: null,    // food object waiting for meal-time selection
};

// ────────────────────────────────────────────
// DOM REFS
// ────────────────────────────────────────────

const $ = id => document.getElementById(id);

const els = {
    goalGrid: $('goalGrid'),
    searchInput: $('searchInput'),
    searchLoader: $('searchLoader'),
    searchError: $('searchError'),
    searchResults: $('searchResults'),
    smartInsights: $('smartInsights'),
    barList: $('barList'),
    donutCanvas: $('donutCanvas'),
    donutCal: $('donutCal'),
    donutLegend: $('donutLegend'),
    mealList: $('mealList'),
    mealTabs: $('mealTabs'),
    clearLogBtn: $('clearLogBtn'),
    waterGlasses: $('waterGlasses'),
    waterCount: $('waterCount'),
    waterPlus: $('waterPlus'),
    waterMinus: $('waterMinus'),
    exportBtn: $('exportBtn'),
    dateDisplay: $('dateDisplay'),
    toastContainer: $('toastContainer'),
    // modals
    mealTimeModal: $('mealTimeModal'),
    modalFoodName: $('modalFoodName'),
    modalCancel: $('modalCancel'),
    exportModal: $('exportModal'),
    exportText: $('exportText'),
    copySummaryBtn: $('copySummaryBtn'),
    closeExportBtn: $('closeExportBtn'),
};

// ────────────────────────────────────────────
// HEALTH SCORE
// Returns 1–10 based on food and goal
// ────────────────────────────────────────────

function calcHealthScore(macros, goal) {
    const { cal, protein, carbs, fat, sugar, fiber } = macros;
    let score = 7; // baseline

    if (goal === 'weight_loss') {
        if (cal > 400) score -= 2;
        if (cal > 600) score -= 1;
        if (sugar > 15) score -= 2;
        if (protein > 15) score += 1;
        if (fiber > 5) score += 1;
        if (fat > 20) score -= 1;
    } else if (goal === 'muscle_gain') {
        if (protein > 15) score += 2;
        if (protein > 25) score += 1;
        if (cal < 100) score -= 1;
        if (sugar > 20) score -= 1;
        if (carbs > 30) score += 1;
    } else if (goal === 'diabetic') {
        if (sugar > 5) score -= 3;
        if (sugar > 10) score -= 2;
        if (fiber > 5) score += 2;
        if (carbs > 40) score -= 2;
        if (protein > 10) score += 1;
    } else { // balanced
        if (sugar > 20) score -= 1;
        if (fiber > 5) score += 1;
        if (cal > 600) score -= 1;
        if (protein > 10) score += 1;
    }

    return Math.max(1, Math.min(10, score));
}

function scoreClass(score) {
    if (score >= 7) return 'score-great';
    if (score >= 4) return 'score-good';
    return 'score-bad';
}

function scoreMealClass(score) {
    if (score >= 7) return 'score-great';
    if (score >= 4) return 'score-good';
    return 'score-bad';
}

// ────────────────────────────────────────────
// TOTALS
// ────────────────────────────────────────────

function getTotals() {
    return state.mealLog.reduce((acc, item) => {
        Object.keys(item.macros).forEach(k => { acc[k] = (acc[k] || 0) + item.macros[k]; });
        return acc;
    }, { cal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0 });
}

// ────────────────────────────────────────────
// RENDER — MACRO BARS
// ────────────────────────────────────────────

function renderBars() {
    const totals = getTotals();
    const targets = GOALS[state.goal];

    els.barList.innerHTML = MACRO_CONFIG.map(m => {
        const val = totals[m.key] || 0;
        const target = targets[m.key];
        const pct = Math.min((val / target) * 100, 100);
        const over = val > target;
        const unit = m.unit === 'kcal' ? 'kcal' : 'g';

        return `
      <div class="bar-item">
        <div class="bar-header">
          <span class="bar-title">
            <i class="fa-solid ${m.icon}" style="color:${m.color}"></i>
            ${m.label}
          </span>
          <span class="bar-val">${Math.round(val)}${unit} / ${target}${unit}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${over ? 'over' : ''}"
               style="width:${pct}%; background:${over ? '' : m.color}; box-shadow: 0 0 8px ${m.color}66">
          </div>
        </div>
      </div>
    `;
    }).join('');
}

// ────────────────────────────────────────────
// RENDER — DONUT CHART
// ────────────────────────────────────────────

function renderDonut() {
    const totals = getTotals();
    const canvas = els.donutCanvas;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const r = 76, thickness = 18;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // data: only cal, protein, carbs, fat for donut
    const segments = [
        { label: 'Calories', value: totals.cal, color: '#ff8c42', unit: 'kcal' },
        { label: 'Protein', value: totals.protein, color: '#b48cf7', unit: 'g' },
        { label: 'Carbs', value: totals.carbs, color: '#ffd166', unit: 'g' },
        { label: 'Fat', value: totals.fat, color: '#ff5757', unit: 'g' },
    ];

    const total = segments.reduce((s, x) => s + x.value, 0);

    if (total === 0) {
        // empty ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#232733';
        ctx.lineWidth = thickness;
        ctx.stroke();
    } else {
        let startAngle = -Math.PI / 2;
        segments.forEach(seg => {
            if (seg.value === 0) return;
            const sliceAngle = (seg.value / total) * (Math.PI * 2);
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
            ctx.strokeStyle = seg.color;
            ctx.lineWidth = thickness;
            ctx.lineCap = 'butt';
            ctx.stroke();
            startAngle += sliceAngle;
        });

        // gap effect
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'transparent';
        ctx.lineWidth = thickness - 2;
        ctx.stroke();
    }

    // center calorie
    els.donutCal.textContent = Math.round(totals.cal);

    // legend
    els.donutLegend.innerHTML = segments.map(s => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${s.color}"></div>
      <span class="legend-label">${s.label}</span>
      <span class="legend-val">${Math.round(s.value)}${s.unit}</span>
    </div>
  `).join('');
}

// ────────────────────────────────────────────
// RENDER — SMART INSIGHTS
// ────────────────────────────────────────────

function renderInsights() {
    const totals = getTotals();
    const targets = GOALS[state.goal];
    const goalInsights = GOALS[state.goal].insights;

    let pills = [...goalInsights];

    // Dynamic alerts
    if (totals.cal > targets.cal) {
        pills.unshift({ text: `Calorie limit exceeded by ${Math.round(totals.cal - targets.cal)} kcal!`, icon: 'fa-triangle-exclamation', cls: 'danger' });
    }
    if (state.goal === 'diabetic' && totals.sugar > targets.sugar) {
        pills.unshift({ text: `Sugar limit exceeded! ${Math.round(totals.sugar)}g / ${targets.sugar}g`, icon: 'fa-droplet', cls: 'danger' });
    }
    if (totals.protein >= targets.protein * 0.9 && state.goal === 'muscle_gain') {
        pills.unshift({ text: 'Great protein intake — on track for gains!', icon: 'fa-trophy', cls: 'accent' });
    }
    if (state.waterGlasses >= 8) {
        pills.unshift({ text: 'Hydration goal achieved! 💧', icon: 'fa-droplet', cls: 'accent' });
    }

    // Show max 3
    pills = pills.slice(0, 3);

    els.smartInsights.innerHTML = pills.map(p => `
    <div class="insight-pill ${p.cls}">
      <i class="fa-solid ${p.icon}"></i>
      <span>${p.text}</span>
    </div>
  `).join('');
}

// ────────────────────────────────────────────
// RENDER — MEAL LIST
// ────────────────────────────────────────────

function renderMealList() {
    const filtered = state.activeTab === 'all'
        ? state.mealLog
        : state.mealLog.filter(item => item.mealTime === state.activeTab);

    if (filtered.length === 0) {
        els.mealList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-plate-wheat"></i>
        <p>${state.activeTab === 'all' ? 'No food added yet — search and add items!' : `No items in ${state.activeTab} yet.`}</p>
      </div>`;
        return;
    }

    els.mealList.innerHTML = filtered.map(item => `
    <div class="meal-item" id="meal-${item.id}">
      <span class="meal-time-badge time-${item.mealTime}">${item.mealTime}</span>
      <div class="meal-info">
        <div class="meal-name">${item.name}</div>
        <div class="meal-macros">
          <span class="meal-macro">🔥 ${Math.round(item.macros.cal)} kcal</span>
          <span class="meal-macro">💪 ${Math.round(item.macros.protein)}g prot</span>
          <span class="meal-macro">🌾 ${Math.round(item.macros.carbs)}g carbs</span>
          <span class="meal-macro">🧈 ${Math.round(item.macros.fat)}g fat</span>
          <span class="meal-macro">🍬 ${Math.round(item.macros.sugar)}g sugar</span>
          <span class="meal-macro">🌿 ${Math.round(item.macros.fiber)}g fiber</span>
        </div>
      </div>
      <span class="meal-score ${scoreMealClass(item.score)}">${item.score}/10</span>
      <button class="meal-remove" onclick="removeItem('${item.id}')">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

// ────────────────────────────────────────────
// RENDER — WATER
// ────────────────────────────────────────────

function renderWater() {
    const total = 8;
    let html = '';
    for (let i = 0; i < total; i++) {
        html += `<span class="water-glass ${i < state.waterGlasses ? 'filled' : 'empty'}">💧</span>`;
    }
    els.waterGlasses.innerHTML = html;
    els.waterCount.textContent = state.waterGlasses;
}

// ────────────────────────────────────────────
// RENDER — ALL
// ────────────────────────────────────────────

function renderAll() {
    renderBars();
    renderDonut();
    renderInsights();
    renderMealList();
    renderWater();
}

// ────────────────────────────────────────────
// GOAL SELECTION
// ────────────────────────────────────────────

els.goalGrid.addEventListener('click', e => {
    const btn = e.target.closest('.goal-btn');
    if (!btn) return;
    document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.goal = btn.dataset.goal;
    renderAll();
    showToast(`Goal set to ${GOALS[state.goal].name}`, 'success', 'fa-bullseye');
});

// ────────────────────────────────────────────
// FOOD SEARCH — OpenFoodFacts
// ────────────────────────────────────────────

let searchTimer;

els.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = els.searchInput.value.trim();
    if (q.length < 2) {
        els.searchResults.innerHTML = `
      <div class="empty-state-small">
        <i class="fa-solid fa-utensils"></i>
        <p>Real data via OpenFoodFacts API</p>
      </div>`;
        return;
    }
    searchTimer = setTimeout(() => searchFood(q), 500);
});

async function searchFood(query) {
    els.searchLoader.classList.remove('hidden');
    els.searchError.classList.add('hidden');
    els.searchResults.innerHTML = '';

    try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments,brands`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();

        const products = (data.products || []).filter(p =>
            p.product_name && p.nutriments
        );

        if (products.length === 0) {
            els.searchResults.innerHTML = `
        <div class="empty-state-small">
          <i class="fa-solid fa-face-sad-tear"></i>
          <p>No results found. Try another name.</p>
        </div>`;
            return;
        }

        els.searchResults.innerHTML = products.map((p, i) => {
            const n = p.nutriments;
            const macros = {
                cal: +(n['energy-kcal_100g'] || n['energy-kcal'] || 0).toFixed(1),
                protein: +(n['proteins_100g'] || 0).toFixed(1),
                carbs: +(n['carbohydrates_100g'] || 0).toFixed(1),
                fat: +(n['fat_100g'] || 0).toFixed(1),
                sugar: +(n['sugars_100g'] || 0).toFixed(1),
                fiber: +(n['fiber_100g'] || 0).toFixed(1),
            };
            const score = calcHealthScore(macros, state.goal);
            const sClass = scoreClass(score);

            return `
        <div class="result-card" data-index="${i}" style="animation-delay:${i * 0.04}s">
          <div class="result-name">
            <span class="score-badge ${sClass}">${score}/10</span>
            ${p.product_name}
          </div>
          <div class="result-macros">
            <span class="result-macro">🔥 ${macros.cal} kcal</span>
            <span class="result-macro">💪 ${macros.protein}g prot</span>
            <span class="result-macro">🌾 ${macros.carbs}g carbs</span>
            <span class="result-macro">🧈 ${macros.fat}g fat</span>
          </div>
        </div>
      `;
        }).join('');

        // click handlers
        els.searchResults.querySelectorAll('.result-card').forEach((card, i) => {
            card.addEventListener('click', () => {
                const p = products[i];
                const n = p.nutriments;
                const macros = {
                    cal: +(n['energy-kcal_100g'] || n['energy-kcal'] || 0).toFixed(1),
                    protein: +(n['proteins_100g'] || 0).toFixed(1),
                    carbs: +(n['carbohydrates_100g'] || 0).toFixed(1),
                    fat: +(n['fat_100g'] || 0).toFixed(1),
                    sugar: +(n['sugars_100g'] || 0).toFixed(1),
                    fiber: +(n['fiber_100g'] || 0).toFixed(1),
                };
                openMealTimeModal({ name: p.product_name, macros });
            });
        });

    } catch (err) {
        els.searchError.textContent = 'Failed to fetch. Check your connection.';
        els.searchError.classList.remove('hidden');
    } finally {
        els.searchLoader.classList.add('hidden');
    }
}

// ────────────────────────────────────────────
// MEAL TIME MODAL
// ────────────────────────────────────────────

function openMealTimeModal(food) {
    state.pendingFood = food;
    els.modalFoodName.textContent = food.name;
    els.mealTimeModal.classList.remove('hidden');
}

els.mealTimeModal.querySelectorAll('.modal-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!state.pendingFood) return;
        const mealTime = btn.dataset.time;
        addFoodToLog(state.pendingFood, mealTime);
        els.mealTimeModal.classList.add('hidden');
        state.pendingFood = null;
    });
});

els.modalCancel.addEventListener('click', () => {
    els.mealTimeModal.classList.add('hidden');
    state.pendingFood = null;
});

// close on overlay click
els.mealTimeModal.addEventListener('click', e => {
    if (e.target === els.mealTimeModal) {
        els.mealTimeModal.classList.add('hidden');
        state.pendingFood = null;
    }
});

// ────────────────────────────────────────────
// ADD FOOD
// ────────────────────────────────────────────

function addFoodToLog(food, mealTime) {
    const score = calcHealthScore(food.macros, state.goal);
    const item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: food.name,
        macros: food.macros,
        mealTime,
        score,
    };
    state.mealLog.push(item);
    renderAll();

    const scoreMsg = score >= 7 ? '✅ Great choice!' : score >= 4 ? '⚠️ Decent pick' : '❗ Watch your intake';
    showToast(`Added to ${mealTime} — Score ${score}/10. ${scoreMsg}`, 'success', 'fa-circle-check');
}

// ────────────────────────────────────────────
// REMOVE FOOD
// ────────────────────────────────────────────

window.removeItem = function (id) {
    state.mealLog = state.mealLog.filter(i => i.id !== id);
    renderAll();
    showToast('Item removed', 'warn', 'fa-trash-can');
};

// ────────────────────────────────────────────
// CLEAR LOG
// ────────────────────────────────────────────

els.clearLogBtn.addEventListener('click', () => {
    if (state.mealLog.length === 0) return;
    state.mealLog = [];
    renderAll();
    showToast('Meal log cleared', 'warn', 'fa-trash-can');
});

// ────────────────────────────────────────────
// MEAL TABS
// ────────────────────────────────────────────

els.mealTabs.addEventListener('click', e => {
    const tab = e.target.closest('.meal-tab');
    if (!tab) return;
    document.querySelectorAll('.meal-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeTab = tab.dataset.tab;
    renderMealList();
});

// ────────────────────────────────────────────
// WATER
// ────────────────────────────────────────────

els.waterPlus.addEventListener('click', () => {
    if (state.waterGlasses >= 8) {
        showToast('Daily water goal already reached! 🎉', 'success', 'fa-trophy');
        return;
    }
    state.waterGlasses++;
    renderWater();
    renderInsights();
    if (state.waterGlasses === 8) {
        showToast('Water goal achieved! Great hydration! 💧', 'success', 'fa-trophy');
    }
});

els.waterMinus.addEventListener('click', () => {
    if (state.waterGlasses <= 0) return;
    state.waterGlasses--;
    renderWater();
    renderInsights();
});

// ────────────────────────────────────────────
// EXPORT DAILY SUMMARY
// ────────────────────────────────────────────

els.exportBtn.addEventListener('click', () => {
    const totals = getTotals();
    const targets = GOALS[state.goal];
    const goal = GOALS[state.goal].name;
    const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Meal breakdown by time
    const byTime = {};
    MEAL_TIMES.forEach(t => {
        const items = state.mealLog.filter(i => i.mealTime === t);
        if (items.length) byTime[t] = items;
    });

    let text = `╔══════════════════════════════════════╗
║     NUTRITRACK — DAILY SUMMARY       ║
╚══════════════════════════════════════╝

📅 ${date}
🎯 Goal: ${goal}
💧 Water: ${state.waterGlasses} / 8 glasses

────────── MACRO TOTALS ──────────
🔥 Calories : ${Math.round(totals.cal)} / ${targets.cal} kcal  ${totals.cal > targets.cal ? '⚠️ OVER' : '✅'}
💪 Protein  : ${Math.round(totals.protein)}g / ${targets.protein}g  ${totals.protein >= targets.protein ? '✅' : ''}
🌾 Carbs    : ${Math.round(totals.carbs)}g / ${targets.carbs}g  ${totals.carbs > targets.carbs ? '⚠️ OVER' : '✅'}
🧈 Fat      : ${Math.round(totals.fat)}g / ${targets.fat}g  ${totals.fat > targets.fat ? '⚠️ OVER' : '✅'}
🍬 Sugar    : ${Math.round(totals.sugar)}g / ${targets.sugar}g  ${totals.sugar > targets.sugar ? '⚠️ OVER' : '✅'}
🌿 Fiber    : ${Math.round(totals.fiber)}g / ${targets.fiber}g  ${totals.fiber >= targets.fiber ? '✅' : ''}

────────── MEAL LOG ──────────`;

    if (state.mealLog.length === 0) {
        text += '\nNo meals logged today.';
    } else {
        MEAL_TIMES.forEach(t => {
            if (!byTime[t]) return;
            text += `\n\n${t.toUpperCase()}:`;
            byTime[t].forEach(item => {
                text += `\n  • ${item.name} [Score: ${item.score}/10]`;
                text += `\n    ${Math.round(item.macros.cal)}kcal | ${Math.round(item.macros.protein)}g prot | ${Math.round(item.macros.carbs)}g carbs`;
            });
        });
    }

    text += `\n\n──────────────────────────────────────
Generated by NutriTrack | AMD Slingshot Hackathon`;

    els.exportText.textContent = text;
    els.exportModal.classList.remove('hidden');
});

els.copySummaryBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(els.exportText.textContent).then(() => {
        showToast('Summary copied to clipboard!', 'success', 'fa-copy');
    });
});

els.closeExportBtn.addEventListener('click', () => els.exportModal.classList.add('hidden'));

els.exportModal.addEventListener('click', e => {
    if (e.target === els.exportModal) els.exportModal.classList.add('hidden');
});

// ────────────────────────────────────────────
// TOAST
// ────────────────────────────────────────────

function showToast(msg, type = 'success', icon = 'fa-circle-check') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i>${msg}`;
    els.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

// ────────────────────────────────────────────
// DATE DISPLAY
// ────────────────────────────────────────────

function setDate() {
    const d = new Date();
    els.dateDisplay.textContent = d.toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

// ────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────

function init() {
    setDate();
    renderAll();
    showToast('Welcome to NutriTrack! 🥗 Select a goal to start.', 'success', 'fa-leaf');
}

init();