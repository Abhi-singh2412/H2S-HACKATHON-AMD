const GOALS = {
    balanced: { label: 'Balanced', cals: 2000, pro: 60, carb: 250, fat: 70, sugar: 30, fiber: 25 },
    weight_loss: { label: 'Weight Loss', cals: 1500, pro: 80, carb: 150, fat: 50, sugar: 20, fiber: 30 },
    muscle_gain: { label: 'Muscle Gain', cals: 2500, pro: 150, carb: 300, fat: 80, sugar: 40, fiber: 30 },
    diabetic: { label: 'Diabetic', cals: 1800, pro: 70, carb: 180, fat: 60, sugar: 15, fiber: 40 }
};

const MOCK_FOODS = {
    apple: [
        { name: 'Apple (Fresh)', cals: 52, pro: 0, carb: 14, fat: 0, sugar: 10, fiber: 2 },
        { name: 'Apple Juice', cals: 46, pro: 0, carb: 11, fat: 0, sugar: 9, fiber: 0 }
    ],
    banana: [{ name: 'Banana', cals: 89, pro: 1, carb: 23, fat: 0, sugar: 12, fiber: 3 }],
    chicken: [
        { name: 'Chicken Breast (Grilled)', cals: 165, pro: 31, carb: 0, fat: 4, sugar: 0, fiber: 0 },
        { name: 'Chicken Curry', cals: 150, pro: 12, carb: 8, fat: 9, sugar: 2, fiber: 1 }
    ],
    rice: [
        { name: 'White Rice (Cooked)', cals: 130, pro: 3, carb: 28, fat: 0, sugar: 0, fiber: 0 },
        { name: 'Brown Rice', cals: 112, pro: 2, carb: 24, fat: 1, sugar: 0, fiber: 2 }
    ],
    egg: [
        { name: 'Boiled Egg', cals: 78, pro: 6, carb: 1, fat: 5, sugar: 0, fiber: 0 },
        { name: 'Omelette', cals: 154, pro: 11, carb: 1, fat: 12, sugar: 0, fiber: 0 }
    ],
    maggi: [{ name: 'Maggi Noodles', cals: 350, pro: 8, carb: 52, fat: 14, sugar: 3, fiber: 2 }],
    bread: [
        { name: 'White Bread (1 slice)', cals: 79, pro: 3, carb: 15, fat: 1, sugar: 2, fiber: 1 },
        { name: 'Brown Bread (1 slice)', cals: 69, pro: 4, carb: 12, fat: 1, sugar: 1, fiber: 2 }
    ],
    milk: [
        { name: 'Full Fat Milk (200ml)', cals: 122, pro: 6, carb: 9, fat: 7, sugar: 9, fiber: 0 },
        { name: 'Skimmed Milk (200ml)', cals: 70, pro: 7, carb: 10, fat: 0, sugar: 10, fiber: 0 }
    ],
    burger: [
        { name: 'Beef Burger', cals: 295, pro: 17, carb: 24, fat: 14, sugar: 5, fiber: 1 },
        { name: 'Veggie Burger', cals: 220, pro: 11, carb: 28, fat: 7, sugar: 4, fiber: 3 }
    ],
    pizza: [{ name: 'Pizza (1 slice)', cals: 285, pro: 12, carb: 36, fat: 10, sugar: 4, fiber: 2 }],
    coca: [{ name: 'Coca Cola (330ml)', cals: 139, pro: 0, carb: 35, fat: 0, sugar: 35, fiber: 0 }],
    oats: [{ name: 'Oatmeal (cooked)', cals: 71, pro: 2, carb: 12, fat: 1, sugar: 1, fiber: 2 }],
    dal: [{ name: 'Dal (Lentil Soup)', cals: 116, pro: 9, carb: 20, fat: 0, sugar: 1, fiber: 8 }],
    paneer: [{ name: 'Paneer (100g)', cals: 265, pro: 18, carb: 3, fat: 20, sugar: 2, fiber: 0 }],
    salad: [{ name: 'Green Salad', cals: 20, pro: 1, carb: 3, fat: 0, sugar: 2, fiber: 2 }],
    almonds: [{ name: 'Almonds (10 pcs)', cals: 69, pro: 3, carb: 2, fat: 6, sugar: 1, fiber: 1 }],
    yogurt: [{ name: 'Greek Yogurt', cals: 100, pro: 10, carb: 6, fat: 2, sugar: 4, fiber: 0 }],
    orange: [{ name: 'Orange', cals: 47, pro: 1, carb: 12, fat: 0, sugar: 9, fiber: 2 }],
    mango: [{ name: 'Mango', cals: 60, pro: 1, carb: 15, fat: 0, sugar: 14, fiber: 2 }],
    roti: [{ name: 'Roti / Chapati', cals: 120, pro: 4, carb: 22, fat: 3, sugar: 0, fiber: 3 }],
    samosa: [{ name: 'Samosa (1 piece)', cals: 262, pro: 4, carb: 30, fat: 14, sugar: 2, fiber: 2 }],
    idli: [{ name: 'Idli (2 pieces)', cals: 130, pro: 4, carb: 26, fat: 1, sugar: 0, fiber: 1 }],
    dosa: [{ name: 'Plain Dosa', cals: 168, pro: 4, carb: 30, fat: 4, sugar: 0, fiber: 1 }]
};

let state = {
    goal: 'balanced',
    mealLog: JSON.parse(localStorage.getItem('mealLog')) || [],
    todayTotals: { cals: 0, pro: 0, carb: 0, fat: 0, sugar: 0, fiber: 0 }
};

let searchTimeout = null;
let macroChart = null;

// --- DOM Elements ---
const goalBtns = document.querySelectorAll('.goal-btn');
const searchInput = document.getElementById('searchInput');
const searchLoader = document.getElementById('searchLoader');
const searchError = document.getElementById('searchError');
const searchResults = document.getElementById('searchResults');
const clearLogBtn = document.getElementById('clearLogBtn');
const mealList = document.getElementById('mealList');
const smartInsights = document.getElementById('smartInsights');
const dateDisplay = document.getElementById('dateDisplay');

dateDisplay.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

// --- Init ---
function init() {
    goalBtns.forEach(btn => btn.addEventListener('click', handleGoalSelect));
    searchInput.addEventListener('input', handleSearchInput);
    clearLogBtn.addEventListener('click', clearMealLog);
    injectChartCanvas();
    updateDashboard();
}

// --- Chart Canvas ---
function injectChartCanvas() {
    const dashboard = document.querySelector('.dashboard');
    const mealLogContainer = document.querySelector('.meal-log-container');
    const chartCard = document.createElement('div');
    chartCard.className = 'card chart-card';
    chartCard.innerHTML = `
        <div class="section-header">
            <h3><i class="fa-solid fa-chart-pie"></i> Macro Breakdown</h3>
        </div>
        <div class="chart-wrapper">
            <canvas id="macroChart"></canvas>
            <div class="chart-legend" id="chartLegend"></div>
        </div>`;
    dashboard.insertBefore(chartCard, mealLogContainer);
}

// --- Goal ---
function handleGoalSelect(e) {
    const btn = e.currentTarget;
    goalBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.goal = btn.dataset.goal;
    updateDashboard();
}

// --- Search ---
function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (searchTimeout) clearTimeout(searchTimeout);
    if (query.length < 2) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-utensils"></i>
                <p>Try: apple, chicken, dal, burger, coca, roti...</p>
            </div>`;
        return;
    }
    searchTimeout = setTimeout(() => fetchFoodData(query), 400);
}

async function fetchFoodData(query) {
    searchLoader.classList.remove('hidden');
    searchError.classList.add('hidden');
    searchResults.innerHTML = '';

    await new Promise(resolve => setTimeout(resolve, 400));

    const key = Object.keys(MOCK_FOODS).find(k =>
        query.toLowerCase().includes(k) || k.includes(query.toLowerCase())
    );

    const products = key ? MOCK_FOODS[key] : [];

    searchLoader.classList.add('hidden');

    if (products.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-question"></i>
                <p>Not found. Try: apple, chicken, rice, egg, dal, roti, burger, pizza, maggi, oats, paneer, samosa, idli, dosa, mango, yogurt</p>
            </div>`;
        return;
    }

    renderSearchResults(products);
}

function renderSearchResults(products) {
    searchResults.innerHTML = '';
    products.forEach(product => {
        const health = calculateHealthScore(product.cals, product.pro, product.carb, product.fat, product.sugar, product.fiber, state.goal);
        let badgeClass = 'badge-moderate';
        if (health.status === 'Good') badgeClass = 'badge-good';
        if (health.status === 'Avoid') badgeClass = 'badge-avoid';

        const foodEmojis = { chicken: '🍗', rice: '🍚', egg: '🥚', apple: '🍎', banana: '🍌', burger: '🍔', pizza: '🍕', maggi: '🍜', milk: '🥛', bread: '🍞', oats: '🥣', dal: '🍲', paneer: '🧀', salad: '🥗', almonds: '🥜', coca: '🥤', yogurt: '🥛', orange: '🍊', mango: '🥭', roti: '🫓', samosa: '🥟', idli: '🍚', dosa: '🥞' };
        const emoji = Object.keys(foodEmojis).find(k => product.name.toLowerCase().includes(k)) ? foodEmojis[Object.keys(foodEmojis).find(k => product.name.toLowerCase().includes(k))] : '🍽️';

        const itemEl = document.createElement('div');
        itemEl.className = 'food-item';
        itemEl.innerHTML = `
            <div class="food-img" style="display:flex;align-items:center;justify-content:center;font-size:26px;background:var(--card-bg);border-radius:var(--radius-sm);">${emoji}</div>
            <div class="food-info">
                <div class="food-name">${product.name}</div>
                <div class="food-macros">
                    <span><i class="fa-solid fa-fire"></i> ${product.cals} kcal</span>
                    <span><i class="fa-solid fa-cube"></i> ${product.pro}g Pro</span>
                </div>
            </div>
            <div class="health-badge ${badgeClass}">${health.status} (${health.score})</div>
            <button class="add-btn" title="Add to Meal Log"><i class="fa-solid fa-plus"></i></button>`;

        itemEl.querySelector('.add-btn').addEventListener('click', () => {
            addToMealLog({ id: Date.now().toString(), ...product, healthStatus: health.status });
        });
        searchResults.appendChild(itemEl);
    });
}

// --- Health Score ---
function calculateHealthScore(cals, pro, carb, fat, sugar, fiber, goalKey) {
    let score = 70;
    if (goalKey === 'diabetic') {
        if (sugar > 10) score -= 30; else if (sugar > 5) score -= 15;
        if (fiber > 5) score += 15;
        if (carb > 50) score -= 10;
    } else if (goalKey === 'weight_loss') {
        if (cals > 250) score -= 20;
        if (fat > 15) score -= 15;
        if (fiber > 3) score += 10;
        if (sugar > 15) score -= 15;
    } else if (goalKey === 'muscle_gain') {
        if (pro > 15) score += 30;
        else if (pro > 8) score += 15;
        if (carb > 30) score += 5;
        if (pro < 3) score -= 20;
    } else {
        if (sugar > 20) score -= 15;
        if (fiber > 3) score += 10;
        if (fat > 20) score -= 10;
        if (pro > 5) score += 5;
    }
    score = Math.max(0, Math.min(100, score));
    let status = 'Moderate';
    if (score >= 80) status = 'Good';
    if (score <= 40) status = 'Avoid';
    return { score, status };
}

// --- Meal Log ---
function addToMealLog(food) {
    state.mealLog.push({ ...food, logId: Date.now().toString() });
    localStorage.setItem('mealLog', JSON.stringify(state.mealLog));
    searchInput.value = '';
    searchResults.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-check" style="color:var(--status-good)"></i>
            <p>Added <strong>${food.name}</strong> to log!</p>
        </div>`;
    showToast(`✅ ${food.name} added!`);
    updateDashboard();
}

function removeMeal(logId) {
    state.mealLog = state.mealLog.filter(m => m.logId !== logId);
    localStorage.setItem('mealLog', JSON.stringify(state.mealLog));
    updateDashboard();
}

function clearMealLog() {
    state.mealLog = [];
    localStorage.removeItem('mealLog');
    updateDashboard();
    showToast('🗑️ Meal log cleared!');
}

// --- Dashboard ---
function calculateTotals() {
    const t = { cals: 0, pro: 0, carb: 0, fat: 0, sugar: 0, fiber: 0 };
    state.mealLog.forEach(m => {
        t.cals += m.cals; t.pro += m.pro;
        t.carb += m.carb; t.fat += m.fat;
        t.sugar += m.sugar; t.fiber += m.fiber;
    });
    state.todayTotals = t;
}

function updateDashboard() {
    calculateTotals();
    const targets = GOALS[state.goal];
    updateMacroStat('cal', state.todayTotals.cals, targets.cals, '');
    updateMacroStat('pro', state.todayTotals.pro, targets.pro, 'g');
    updateMacroStat('carb', state.todayTotals.carb, targets.carb, 'g');
    updateMacroStat('fat', state.todayTotals.fat, targets.fat, 'g');
    updateMacroStat('sugar', state.todayTotals.sugar, targets.sugar, 'g');
    updateMacroStat('fiber', state.todayTotals.fiber, targets.fiber, 'g');
    renderMealList();
    generateSmartInsights(targets);
    updateMacroChart();
}

function updateMacroStat(idPrefix, current, max, unit) {
    const valueEl = document.getElementById(`${idPrefix}Value`);
    const barEl = document.getElementById(`${idPrefix}Bar`);
    valueEl.innerText = `${current}${unit} / ${max}${unit}`;
    barEl.style.width = `${Math.min((current / max) * 100, 100)}%`;
    if (current > max) {
        barEl.style.backgroundColor = 'var(--status-avoid)';
        valueEl.style.color = 'var(--status-avoid)';
    } else {
        barEl.style.backgroundColor = '';
        valueEl.style.color = '';
    }
}

function renderMealList() {
    if (state.mealLog.length === 0) {
        mealList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-plate-wheat"></i>
                <p>No food added yet. Search and add items.</p>
            </div>`;
        return;
    }
    mealList.innerHTML = '';
    state.mealLog.forEach(food => {
        const el = document.createElement('div');
        el.className = 'log-item';
        let icon = `<i class="fa-solid fa-circle" style="color:var(--status-moderate)"></i>`;
        if (food.healthStatus === 'Good') icon = `<i class="fa-solid fa-circle-check" style="color:var(--status-good)"></i>`;
        if (food.healthStatus === 'Avoid') icon = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--status-avoid)"></i>`;
        el.innerHTML = `
            <div class="log-item-info">
                <h4>${icon} ${food.name}</h4>
                <p>${food.cals} kcal | ${food.pro}g Pro | ${food.carb}g Carb | ${food.fat}g Fat</p>
            </div>
            <button class="remove-btn" onclick="removeMeal('${food.logId}')">
                <i class="fa-solid fa-xmark"></i>
            </button>`;
        mealList.appendChild(el);
    });
}

// --- Chart ---
function updateMacroChart() {
    const ctx = document.getElementById('macroChart');
    if (!ctx) return;
    const t = state.todayTotals;
    const total = t.pro + t.carb + t.fat;
    if (macroChart) macroChart.destroy();
    if (total === 0) {
        document.getElementById('chartLegend').innerHTML = `<p style="color:#888;font-size:13px">Add food to see breakdown</p>`;
        return;
    }
    macroChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
                data: [t.pro, t.carb, t.fat],
                backgroundColor: ['#a78bfa', '#fbbf24', '#f87171'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw}g` } }
            }
        }
    });
    const proP = Math.round((t.pro / total) * 100);
    const carbP = Math.round((t.carb / total) * 100);
    const fatP = Math.round((t.fat / total) * 100);
    document.getElementById('chartLegend').innerHTML = `
        <div class="legend-item"><span class="dot" style="background:#a78bfa"></span> Protein ${proP}%</div>
        <div class="legend-item"><span class="dot" style="background:#fbbf24"></span> Carbs ${carbP}%</div>
        <div class="legend-item"><span class="dot" style="background:#f87171"></span> Fat ${fatP}%</div>`;
}

// --- Smart Insights ---
function generateSmartInsights(targets) {
    const t = state.todayTotals;
    const insights = [];
    if (t.cals === 0) {
        insights.push({ type: 'info', text: 'Start logging meals to see your daily insights.', icon: 'info-circle' });
    } else {
        if (state.goal === 'diabetic') {
            if (t.sugar > targets.sugar) insights.push({ type: 'warning', text: '⚠️ Sugar limit exceeded! Be careful.', icon: 'triangle-exclamation' });
            else if (t.sugar > targets.sugar * 0.8) insights.push({ type: 'warning', text: 'Approaching daily sugar limit.', icon: 'bell' });
            if (t.fiber > targets.fiber * 0.5) insights.push({ type: 'success', text: 'Great fiber intake! Helps stabilize blood sugar.', icon: 'check-circle' });
        }
        if (state.goal === 'muscle_gain') {
            if (t.pro < targets.pro * 0.3 && t.cals > targets.cals * 0.5) insights.push({ type: 'warning', text: 'Protein too low for your calorie count today.', icon: 'dumbbell' });
            else if (t.pro >= targets.pro) insights.push({ type: 'success', text: 'Protein target reached! 💪', icon: 'check-circle' });
        }
        if (state.goal === 'weight_loss') {
            if (t.cals > targets.cals) insights.push({ type: 'warning', text: '⚠️ Calorie limit exceeded!', icon: 'triangle-exclamation' });
            else if (t.cals > targets.cals * 0.8) insights.push({ type: 'info', text: 'Close to your calorie limit today.', icon: 'bell' });
        }
        if (t.fat > targets.fat) insights.push({ type: 'warning', text: 'Daily fat allowance exceeded.', icon: 'burger' });
        if (t.cals > 0 && insights.length === 0) insights.push({ type: 'success', text: '🌟 Perfectly on track with your macros!', icon: 'star' });
    }
    smartInsights.innerHTML = '';
    insights.forEach(ins => {
        const el = document.createElement('div');
        el.className = `insight-pill ${ins.type}`;
        el.innerHTML = `<i class="fa-solid fa-${ins.icon}"></i> ${ins.text}`;
        smartInsights.appendChild(el);
    });
}

// --- Toast ---
function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}

init();