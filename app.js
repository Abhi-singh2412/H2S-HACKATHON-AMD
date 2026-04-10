const GOALS = {
    balanced: { label: 'Balanced', cals: 2000, pro: 60, carb: 250, fat: 70, sugar: 30, fiber: 25 },
    weight_loss: { label: 'Weight Loss', cals: 1500, pro: 80, carb: 150, fat: 50, sugar: 20, fiber: 30 },
    muscle_gain: { label: 'Muscle Gain', cals: 2500, pro: 150, carb: 300, fat: 80, sugar: 40, fiber: 30 },
    diabetic: { label: 'Diabetic', cals: 1800, pro: 70, carb: 180, fat: 60, sugar: 15, fiber: 40 }
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

// --- Initialization ---
function init() {
    goalBtns.forEach(btn => btn.addEventListener('click', handleGoalSelect));
    searchInput.addEventListener('input', handleSearchInput);
    clearLogBtn.addEventListener('click', clearMealLog);

    injectChartCanvas();
    updateDashboard();
}

// --- Inject Chart Canvas dynamically ---
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
        </div>
    `;
    dashboard.insertBefore(chartCard, mealLogContainer);
}

// --- Goal Handling ---
function handleGoalSelect(e) {
    const btn = e.currentTarget;
    goalBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.goal = btn.dataset.goal;
    updateDashboard();
}

// --- Search & API Fetch ---
function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (searchTimeout) clearTimeout(searchTimeout);

    if (query.length < 2) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-utensils"></i>
                <p>Real nutrition from OpenFoodFacts API</p>
            </div>`;
        searchError.classList.add('hidden');
        return;
    }

    searchTimeout = setTimeout(() => fetchFoodData(query), 500);
}

async function fetchFoodData(query) {
    searchLoader.classList.remove('hidden');
    searchError.classList.add('hidden');
    searchResults.innerHTML = '';

    try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();

        if (!data.products || data.products.length === 0) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-circle-question"></i>
                    <p>No foods found. Try another term.</p>
                </div>`;
            return;
        }

        renderSearchResults(data.products);
    } catch (err) {
        console.error(err);
        searchError.innerText = "Error connecting to food database. Check internet connection.";
        searchError.classList.remove('hidden');
    } finally {
        searchLoader.classList.add('hidden');
    }
}

function renderSearchResults(products) {
    searchResults.innerHTML = '';

    const validProducts = products.filter(p => p.nutriments && p.nutriments['energy-kcal_100g'] !== undefined);

    if (validProducts.length === 0) {
        searchResults.innerHTML = `<div class="empty-state"><p>Items found but missing nutrition data.</p></div>`;
        return;
    }

    validProducts.forEach(product => {
        const pName = product.product_name || 'Unknown Food';

        // ✅ FIXED: placeholder fallback
        const img = product.image_front_thumb_url || 'https://placehold.co/48x48?text=🍽️';

        const n = product.nutriments;
        const cals = Math.round(n['energy-kcal_100g'] || 0);
        const pro = Math.round(n.proteins_100g || 0);
        const carb = Math.round(n.carbohydrates_100g || 0);
        const fat = Math.round(n.fat_100g || 0);
        const sugar = Math.round(n.sugars_100g || 0);
        const fiber = Math.round(n.fiber_100g || 0);

        const health = calculateHealthScore(cals, pro, carb, fat, sugar, fiber, state.goal);

        let badgeClass = 'badge-moderate';
        if (health.status === 'Good') badgeClass = 'badge-good';
        if (health.status === 'Avoid') badgeClass = 'badge-avoid';

        const itemEl = document.createElement('div');
        itemEl.className = 'food-item';
        itemEl.innerHTML = `
            <img src="${img}" alt="${pName}" class="food-img" onerror="this.src='https://placehold.co/48x48?text=🍽️'">
            <div class="food-info">
                <div class="food-name">${pName}</div>
                <div class="food-macros">
                    <span><i class="fa-solid fa-fire"></i> ${cals} kcal</span>
                    <span><i class="fa-solid fa-cube"></i> ${pro}g Pro</span>
                </div>
            </div>
            <div class="health-badge ${badgeClass}">${health.status} (${health.score})</div>
            <button class="add-btn" title="Add to Meal Log">
                <i class="fa-solid fa-plus"></i>
            </button>`;

        itemEl.querySelector('.add-btn').addEventListener('click', () => {
            addToMealLog({ id: product.id || Date.now().toString(), name: pName, cals, pro, carb, fat, sugar, fiber, healthStatus: health.status });
        });

        searchResults.appendChild(itemEl);
    });
}

// --- Health Scoring Algorithm ---
function calculateHealthScore(cals, pro, carb, fat, sugar, fiber, goalKey) {
    let score = 70;

    if (goalKey === 'diabetic') {
        if (sugar > 10) score -= 30;
        else if (sugar > 5) score -= 15;
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
    localStorage.setItem('mealLog', JSON.stringify(state.mealLog)); // ✅ Persist

    searchInput.value = '';
    searchResults.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-check" style="color:var(--status-good)"></i>
            <p>Added <strong>${food.name}</strong> to log!</p>
        </div>`;

    showToast(`✅ ${food.name} added to meal log!`);
    updateDashboard();
}

function removeMeal(logId) {
    state.mealLog = state.mealLog.filter(m => m.logId !== logId);
    localStorage.setItem('mealLog', JSON.stringify(state.mealLog)); // ✅ Persist
    updateDashboard();
}

function clearMealLog() {
    state.mealLog = [];
    localStorage.removeItem('mealLog'); // ✅ Clear storage
    updateDashboard();
    showToast('🗑️ Meal log cleared!');
}

// --- Dashboard Update ---
function calculateTotals() {
    const t = { cals: 0, pro: 0, carb: 0, fat: 0, sugar: 0, fiber: 0 };
    state.mealLog.forEach(m => {
        t.cals += m.cals;
        t.pro += m.pro;
        t.carb += m.carb;
        t.fat += m.fat;
        t.sugar += m.sugar;
        t.fiber += m.fiber;
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
    updateMacroChart(); // ✅ NEW
}

function updateMacroStat(idPrefix, current, max, unit) {
    const valueEl = document.getElementById(`${idPrefix}Value`);
    const barEl = document.getElementById(`${idPrefix}Bar`);

    valueEl.innerText = `${current}${unit} / ${max}${unit}`;

    let pct = Math.min((current / max) * 100, 100);
    barEl.style.width = `${pct}%`;

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

        let statusIcon = `<i class="fa-solid fa-circle" style="color:var(--status-moderate)"></i>`;
        if (food.healthStatus === 'Good') statusIcon = `<i class="fa-solid fa-circle-check" style="color:var(--status-good)"></i>`;
        if (food.healthStatus === 'Avoid') statusIcon = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--status-avoid)"></i>`;

        el.innerHTML = `
            <div class="log-item-info">
                <h4>${statusIcon} ${food.name}</h4>
                <p>${food.cals} kcal | ${food.pro}g Pro | ${food.carb}g Carb | ${food.fat}g Fat</p>
            </div>
            <button class="remove-btn" onclick="removeMeal('${food.logId}')">
                <i class="fa-solid fa-xmark"></i>
            </button>`;

        mealList.appendChild(el);
    });
}

// --- ✅ NEW: Chart.js Donut Chart ---
function updateMacroChart() {
    const ctx = document.getElementById('macroChart');
    if (!ctx) return;

    const t = state.todayTotals;
    const total = t.pro + t.carb + t.fat;

    if (macroChart) macroChart.destroy();

    if (total === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
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
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw}g`
                    }
                }
            }
        }
    });

    // Custom legend
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

// --- ✅ NEW: Toast Notification ---
function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Bootstrap
init();