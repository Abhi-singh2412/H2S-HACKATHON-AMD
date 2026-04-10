const GOALS = {
    balanced: { label: 'Balanced', cals: 2000, pro: 60, carb: 250, fat: 70, sugar: 30, fiber: 25 },
    weight_loss: { label: 'Weight Loss', cals: 1500, pro: 80, carb: 150, fat: 50, sugar: 20, fiber: 30 },
    muscle_gain: { label: 'Muscle Gain', cals: 2500, pro: 150, carb: 300, fat: 80, sugar: 40, fiber: 30 },
    diabetic: { label: 'Diabetic', cals: 1800, pro: 70, carb: 180, fat: 60, sugar: 15, fiber: 40 }
};

let state = {
    goal: 'balanced',
    mealLog: [],
    todayTotals: { cals: 0, pro: 0, carb: 0, fat: 0, sugar: 0, fiber: 0 }
};

let searchTimeout = null;

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
    // Event Listeners
    goalBtns.forEach(btn => btn.addEventListener('click', handleGoalSelect));
    searchInput.addEventListener('input', handleSearchInput);
    clearLogBtn.addEventListener('click', clearMealLog);
    
    updateDashboard();
}

// --- Goal Handling ---
function handleGoalSelect(e) {
    const btn = e.currentTarget;
    goalBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    state.goal = btn.dataset.goal;
    updateDashboard(); // Refresh bars and insights based on new goal targets
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
            </div>
        `;
        searchError.classList.add('hidden');
        return;
    }

    searchTimeout = setTimeout(() => {
        fetchFoodData(query);
    }, 500); // 500ms debounce
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
                </div>
            `;
            return;
        }

        renderSearchResults(data.products);
    } catch (err) {
        console.error(err);
        searchError.innerText = "Error connecting to food database.";
        searchError.classList.remove('hidden');
    } finally {
        searchLoader.classList.add('hidden');
    }
}

function renderSearchResults(products) {
    searchResults.innerHTML = '';
    
    // Filter out items without basic nutrition
    const validProducts = products.filter(p => p.nutriments && p.nutriments['energy-kcal_100g'] !== undefined);

    if (validProducts.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <p>Items found but missing nutrition data.</p>
            </div>
        `;
        return;
    }

    validProducts.forEach(product => {
        const pName = product.product_name || 'Unknown Food';
        const img = product.image_front_thumb_url || 'https://via.placeholder.com/48?text=Food';
        
        const n = product.nutriments;
        const cals = Math.round(n['energy-kcal_100g'] || 0);
        const pro = Math.round(n.proteins_100g || 0);
        const carb = Math.round(n.carbohydrates_100g || 0);
        const fat = Math.round(n.fat_100g || 0);
        const sugar = Math.round(n.sugars_100g || 0);
        const fiber = Math.round(n.fiber_100g || 0);
        
        // Calculate health score & status
        const health = calculateHealthScore(cals, pro, carb, fat, sugar, fiber, state.goal);
        
        let badgeClass = 'badge-moderate';
        if (health.status === 'Good') badgeClass = 'badge-good';
        if (health.status === 'Avoid') badgeClass = 'badge-avoid';

        const itemEl = document.createElement('div');
        itemEl.className = 'food-item';
        
        itemEl.innerHTML = `
            <img src="${img}" alt="${pName}" class="food-img">
            <div class="food-info">
                <div class="food-name">${pName}</div>
                <div class="food-macros">
                    <span><i class="fa-solid fa-fire"></i>${cals}</span>
                    <span><i class="fa-solid fa-cube"></i>${pro}g Pro</span>
                </div>
            </div>
            <div class="health-badge ${badgeClass}">${health.status} (${health.score})</div>
            <button class="add-btn" title="Add to Meal Log">
                <i class="fa-solid fa-plus"></i>
            </button>
        `;

        // Add Event Listener
        const addBtn = itemEl.querySelector('.add-btn');
        addBtn.addEventListener('click', () => {
            addToMealLog({
                id: product.id || Date.now().toString(),
                name: pName,
                cals, pro, carb, fat, sugar, fiber,
                healthStatus: health.status
            });
        });

        searchResults.appendChild(itemEl);
    });
}

// --- Health Scoring Algorithm ---
function calculateHealthScore(cals, pro, carb, fat, sugar, fiber, goalKey) {
    let score = 70; // Base score out of 100
    
    // Evaluate per 100g
    if (goalKey === 'diabetic') {
        if (sugar > 10) score -= 30;
        if (sugar > 5 && sugar <= 10) score -= 15;
        if (fiber > 5) score += 15;
        if (carb > 50) score -= 10;
    } 
    else if (goalKey === 'weight_loss') {
        if (cals > 250) score -= 20; // High calorie density
        if (fat > 15) score -= 15;
        if (fiber > 3) score += 10;
        if (sugar > 15) score -= 15;
    }
    else if (goalKey === 'muscle_gain') {
        if (pro > 15) score += 30;
        if (pro > 8 && pro <= 15) score += 15;
        if (carb > 30) score += 5; // Carbs are okay for energy
        if (pro < 3) score -= 20; // Very low protein
    }
    else {
        // Balanced
        if (sugar > 20) score -= 15;
        if (fiber > 3) score += 10;
        if (fat > 20) score -= 10;
        if (pro > 5) score += 5;
    }

    // Cap score between 0 and 100
    score = Math.max(0, Math.min(100, score));
    
    let status = 'Moderate';
    if (score >= 80) status = 'Good';
    if (score <= 40) status = 'Avoid';

    return { score, status };
}

// --- Meal Log & Dashboard ---
function addToMealLog(food) {
    // For simplicity, adding 100g serving
    state.mealLog.push({
        ...food,
        logId: Date.now().toString() // Unique ID for deletion
    });
    
    // Clear search for UX
    searchInput.value = '';
    searchResults.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-check text-green"></i>
            <p>Added ${food.name} to log!</p>
        </div>
    `;
    
    updateDashboard();
}

function removeMeal(logId) {
    state.mealLog = state.mealLog.filter(m => m.logId !== logId);
    updateDashboard();
}

function clearMealLog() {
    state.mealLog = [];
    updateDashboard();
}

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
    
    // Update Progress Bars
    updateMacroStat('cal', state.todayTotals.cals, targets.cals, '');
    updateMacroStat('pro', state.todayTotals.pro, targets.pro, 'g');
    updateMacroStat('carb', state.todayTotals.carb, targets.carb, 'g');
    updateMacroStat('fat', state.todayTotals.fat, targets.fat, 'g');
    updateMacroStat('sugar', state.todayTotals.sugar, targets.sugar, 'g');
    updateMacroStat('fiber', state.todayTotals.fiber, targets.fiber, 'g');

    // Update Meal List UI
    renderMealList();
    
    // Update Smart Insights
    generateSmartInsights(targets);
}

function updateMacroStat(idPrefix, current, max, unit) {
    const valueEl = document.getElementById(`${idPrefix}Value`);
    const barEl = document.getElementById(`${idPrefix}Bar`);
    
    valueEl.innerText = `${current}${unit} / ${max}${unit}`;
    
    let percentage = (current / max) * 100;
    if (percentage > 100) percentage = 100;
    
    barEl.style.width = `${percentage}%`;
    
    // Color alert if exceeded
    if (current > max) {
        barEl.style.backgroundColor = 'var(--status-avoid)';
        valueEl.style.color = 'var(--status-avoid)';
    } else {
        // Reset to default variable based on metric
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
            </div>
        `;
        return;
    }
    
    mealList.innerHTML = '';
    state.mealLog.forEach(food => {
        const el = document.createElement('div');
        el.className = 'log-item';
        
        let statusIcon = '<i class="fa-solid fa-circle" style="color: var(--status-moderate)"></i>';
        if (food.healthStatus === 'Good') statusIcon = '<i class="fa-solid fa-circle-check" style="color: var(--status-good)"></i>';
        if (food.healthStatus === 'Avoid') statusIcon = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--status-avoid)"></i>';

        el.innerHTML = `
            <div class="log-item-info">
                <h4>${statusIcon} ${food.name}</h4>
                <p>${food.cals} kcal | ${food.pro}g Pro | ${food.carb}g Carb | ${food.fat}g Fat</p>
            </div>
            <button class="remove-btn" onclick="removeMeal('${food.logId}')">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        mealList.appendChild(el);
    });
}

function generateSmartInsights(targets) {
    const t = state.todayTotals;
    const insights = [];
    
    // Rule based insights
    if (t.cals === 0) {
        insights.push({ type: 'info', text: 'Start logging meals to see your daily insights.', icon: 'info-circle' });
    } else {
        // Goal specifics
        if (state.goal === 'diabetic') {
            if (t.sugar > targets.sugar) insights.push({ type: 'warning', text: '⚠️ You have exceeded your daily sugar limit. Please be careful.', icon: 'triangle-exclamation' });
            else if (t.sugar > targets.sugar * 0.8) insights.push({ type: 'warning', text: 'Approaching daily sugar limit.', icon: 'bell' });
            
            if (t.fiber > targets.fiber * 0.5) insights.push({ type: 'success', text: 'Great fiber intake! Helps stabilize blood sugar.', icon: 'check-circle' });
        }
        
        if (state.goal === 'muscle_gain') {
            if (t.pro < targets.pro * 0.3 && t.cals > targets.cals * 0.5) insights.push({ type: 'warning', text: 'Protein intake is too low for your calorie count today.', icon: 'dumbbell' });
            else if (t.pro >= targets.pro) insights.push({ type: 'success', text: 'Protein target reached! 💪', icon: 'check-circle' });
        }
        
        if (state.goal === 'weight_loss') {
            if (t.cals > targets.cals) insights.push({ type: 'warning', text: '⚠️ Calorie limit exceeded for weight loss goal.', icon: 'triangle-exclamation' });
            else if (t.cals > targets.cals * 0.8) insights.push({ type: 'info', text: 'You are close to your calorie limit today.', icon: 'bell' });
        }

        // General
        if (t.fat > targets.fat) insights.push({ type: 'warning', text: 'Daily fat allowance exceeded.', icon: 'burger' });
        if (t.cals > 0 && insights.length === 0) insights.push({ type: 'success', text: 'You are perfectly on track with your macros!', icon: 'star' });
    }

    // Render insights
    smartInsights.innerHTML = '';
    insights.forEach(ins => {
        const el = document.createElement('div');
        el.className = `insight-pill ${ins.type}`;
        el.innerHTML = `<i class="fa-solid fa-${ins.icon}"></i> ${ins.text}`;
        smartInsights.appendChild(el);
    });
}

// Bootstrap
init();
