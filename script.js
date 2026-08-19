// =============================================
//  TRAVELLOG — Complete Travel Logger
//  Built by Samuel Giftson S
// =============================================

// ============ TOAST ============
function toast(msg, type) {
    var box = document.getElementById('toastBox');
    var el = document.createElement('div');
    el.className = 'toast-item toast-' + (type || 'info');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function() { el.remove(); }, 4000);
}

// ============ DATA ============
var allTrips = JSON.parse(localStorage.getItem('tlTrips') || '[]');
var bucketList = JSON.parse(localStorage.getItem('tlBucket') || '[]');
var currentTripId = null;

// ============ NAVIGATION ============
function navigate(pageId) {
    var pages = document.querySelectorAll('.pg');
    for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove('show');
    }
    document.getElementById(pageId).classList.add('show');
    window.scrollTo(0, 0);

    if (pageId === 'home') { updateDashboard(); renderRecentTrips(); }
    if (pageId === 'trips') { renderTrips(); }
    if (pageId === 'expenses') { renderAllExpenses(); }
    if (pageId === 'map') { setTimeout(initMap, 200); }
    if (pageId === 'currency') { convertCurrency(); renderCurrencyTable(); }
    if (pageId === 'bucket') { renderBucket(); }
}

// ============ THEME — TIME BASED ============
function applyTimeTheme() {
    var hour = new Date().getHours();
    var body = document.body;

    // Remove all theme classes
    body.classList.remove('theme-morning', 'theme-afternoon', 'theme-evening', 'theme-night');

    // Don't override if manual dark mode is on
    if (body.classList.contains('dark-theme')) { return; }

    if (hour >= 5 && hour < 12) {
        body.classList.add('theme-morning');
    } else if (hour >= 12 && hour < 17) {
        body.classList.add('theme-afternoon');
    } else if (hour >= 17 && hour < 21) {
        body.classList.add('theme-evening');
    } else {
        body.classList.add('theme-night');
    }
}

function switchTheme() {
    var body = document.body;
    body.classList.toggle('dark-theme');
    var btn = document.querySelector('.themebtn');

    if (body.classList.contains('dark-theme')) {
        btn.textContent = '☀️';
        body.classList.remove('theme-morning', 'theme-afternoon', 'theme-evening', 'theme-night');
        localStorage.setItem('tlTheme', 'dark');
    } else {
        btn.textContent = '🌙';
        localStorage.removeItem('tlTheme');
        applyTimeTheme();
    }
}

// ============ NAME / LOGIN ============
function saveName() {
    var n = document.getElementById('nameInput').value.trim();
    if (!n) {
        toast('Enter your name, explorer!', 'warn');
        return;
    }
    localStorage.setItem('tlName', n);
    document.getElementById('loginPopup').classList.add('hidden');
    updateGreeting();
    toast('Welcome aboard, ' + n + '! 🌊', 'ok');
}

function updateGreeting() {
    var n = localStorage.getItem('tlName');
    if (!n) { return; }

    var hour = new Date().getHours();
    var g = '';
    var m = '';

    if (hour >= 5 && hour < 12) {
        g = '🌅 Good Morning, ' + n + '!';
        m = 'A perfect day for an adventure!';
    } else if (hour >= 12 && hour < 17) {
        g = '☀️ Good Afternoon, ' + n + '!';
        m = 'Where will the sun take you today?';
    } else if (hour >= 17 && hour < 21) {
        g = '🌇 Good Evening, ' + n + '!';
        m = 'Golden hour — time to explore!';
    } else {
        g = '🌙 Good Night, ' + n + '!';
        m = 'Dream of your next destination! ✨';
    }

    var greetEl = document.getElementById('heroGreeting');
    var msgEl = document.getElementById('heroMessage');
    if (greetEl) { greetEl.textContent = g; }
    if (msgEl) { msgEl.textContent = m; }
}

// ============ DASHBOARD ============
function updateDashboard() {
    var totalTrips = allTrips.length;
    var totalPlaces = 0;
    var totalSpent = 0;
    var totalDays = 0;

    for (var i = 0; i < allTrips.length; i++) {
        var trip = allTrips[i];
        totalPlaces++;

        if (trip.expenses) {
            for (var j = 0; j < trip.expenses.length; j++) {
                totalSpent += trip.expenses[j].amount || 0;
            }
        }

        if (trip.startDate && trip.endDate) {
            var start = new Date(trip.startDate);
            var end = new Date(trip.endDate);
            var days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            if (days > 0) { totalDays += days; }
        }
    }

    document.getElementById('stTrips').textContent = totalTrips;
    document.getElementById('stPlaces').textContent = totalPlaces;
    document.getElementById('stSpent').textContent = '₹' + totalSpent.toLocaleString();
    document.getElementById('stDays').textContent = totalDays;
}

function renderRecentTrips() {
    var container = document.getElementById('recentTrips');
    if (allTrips.length === 0) {
        container.innerHTML = '<p class="placeholder">No trips yet! Plan your first adventure! ✈️</p>';
        return;
    }

    var recent = allTrips.slice(-3).reverse();
    var html = '';
    for (var i = 0; i < recent.length; i++) {
        var t = recent[i];
        var spent = getTripSpent(t);
        html += '<div class="trip-card" style="margin-bottom:10px;">';
        html += '<div class="trip-card-top" style="background:linear-gradient(135deg,' + getTripColor(t.type) + ')">';
        html += '<h3>' + t.name + '</h3>';
        html += '<p>📍 ' + t.destination + ' · ' + t.type + '</p>';
        html += '</div>';
        html += '<div class="trip-card-bot">';
        html += '<div class="trip-card-meta"><span>📅 ' + t.startDate + '</span><span>💰 ' + t.currency + spent.toLocaleString() + '</span></div>';
        html += '<button class="btn small primary" onclick="viewTrip(\'' + t.id + '\')">View →</button>';
        html += '</div></div>';
    }
    container.innerHTML = html;
}

// ============ TRIP MANAGEMENT ============
function saveTrip() {
    var name = document.getElementById('tripName').value.trim();
    var dest = document.getElementById('tripDest').value.trim();
    var start = document.getElementById('tripStart').value;
    var end = document.getElementById('tripEnd').value;
    var budget = parseFloat(document.getElementById('tripBudget').value) || 0;
    var currency = document.getElementById('tripCurrency').value;
    var type = document.getElementById('tripType').value;
    var notes = document.getElementById('tripNotes').value.trim();

    if (!name) { toast('Enter trip name!', 'warn'); return; }
    if (!dest) { toast('Enter destination!', 'warn'); return; }
    if (!start || !end) { toast('Pick start and end dates!', 'warn'); return; }

    var startDate = new Date(start);
    var endDate = new Date(end);
    if (endDate < startDate) { toast('End date must be after start date!', 'warn'); return; }

    var days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    var trip = {
        id: 'trip_' + Date.now(),
        name: name,
        destination: dest,
        startDate: start,
        endDate: end,
        days: days,
        budget: budget,
        currency: currency,
        type: type,
        notes: notes,
        expenses: [],
        itinerary: [],
        createdAt: new Date().toLocaleDateString()
    };

    // Create empty itinerary days
    for (var d = 0; d < days; d++) {
        var dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + d);
        trip.itinerary.push({
            day: d + 1,
            date: dayDate.toLocaleDateString(),
            activities: []
        });
    }

    allTrips.push(trip);
    saveTripsToStorage();
    toast('Trip "' + name + '" created! ✈️', 'ok');

    // Clear form
    document.getElementById('tripName').value = '';
    document.getElementById('tripDest').value = '';
    document.getElementById('tripStart').value = '';
    document.getElementById('tripEnd').value = '';
    document.getElementById('tripBudget').value = '';
    document.getElementById('tripNotes').value = '';

    navigate('trips');
}

function saveTripsToStorage() {
    localStorage.setItem('tlTrips', JSON.stringify(allTrips));
}

function getTripStatus(trip) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var start = new Date(trip.startDate);
    var end = new Date(trip.endDate);

    if (today < start) { return 'upcoming'; }
    if (today > end) { return 'completed'; }
    return 'ongoing';
}

function getTripStatusLabel(status) {
    if (status === 'upcoming') { return '📅 Upcoming'; }
    if (status === 'ongoing') { return '🟢 Ongoing'; }
    return '✅ Completed';
}

function getTripSpent(trip) {
    var total = 0;
    if (trip.expenses) {
        for (var i = 0; i < trip.expenses.length; i++) {
            total += trip.expenses[i].amount || 0;
        }
    }
    return total;
}

function getTripColor(type) {
    var colors = {
        '🏖️ Beach': '#0ea5e9,#06b6d4',
        '🏔️ Mountain': '#059669,#10b981',
        '🏙️ City': '#7c3aed,#8b5cf6',
        '🏛️ Heritage': '#d97706,#f59e0b',
        '🌿 Nature': '#16a34a,#22c55e',
        '🎢 Adventure': '#e11d48,#f43f5e',
        '🙏 Pilgrimage': '#9333ea,#a855f7',
        '🍔 Food Tour': '#ea580c,#f97316'
    };
    return colors[type] || '#0ea5e9,#06b6d4';
}

function renderTrips(filter) {
    var container = document.getElementById('tripsList');
    if (allTrips.length === 0) {
        container.innerHTML = '<p class="placeholder">No trips yet! Click ➕ to plan one!</p>';
        return;
    }

    var tripsToShow = allTrips;
    if (filter && filter !== 'all') {
        tripsToShow = allTrips.filter(function(t) {
            return getTripStatus(t) === filter;
        });
    }

    if (tripsToShow.length === 0) {
        container.innerHTML = '<p class="placeholder">No ' + filter + ' trips found!</p>';
        return;
    }

    var html = '';
    for (var i = tripsToShow.length - 1; i >= 0; i--) {
        var t = tripsToShow[i];
        var status = getTripStatus(t);
        var spent = getTripSpent(t);
        var budgetPercent = t.budget > 0 ? Math.min(100, Math.round(spent / t.budget * 100)) : 0;
        var barColor = budgetPercent > 90 ? '#ef4444' : budgetPercent > 70 ? '#f59e0b' : '#10b981';

        html += '<div class="trip-card">';
        html += '<div class="trip-card-top" style="background:linear-gradient(135deg,' + getTripColor(t.type) + ')">';
        html += '<span class="trip-status">' + getTripStatusLabel(status) + '</span>';
        html += '<h3>' + t.name + '</h3>';
        html += '<p>📍 ' + t.destination + ' · ' + t.type + '</p>';
        html += '</div>';
        html += '<div class="trip-card-bot">';
        html += '<div class="trip-card-meta">';
        html += '<span>📅 ' + t.startDate + ' → ' + t.endDate + '</span>';
        html += '<span>' + t.days + ' days</span>';
        html += '</div>';

        if (t.budget > 0) {
            html += '<div class="trip-card-meta"><span>💰 ' + t.currency + spent.toLocaleString() + ' / ' + t.currency + t.budget.toLocaleString() + '</span><span>' + budgetPercent + '%</span></div>';
            html += '<div class="trip-budget-bar"><div class="trip-budget-fill" style="width:' + budgetPercent + '%;background:' + barColor + ';"></div></div>';
        }

        html += '<div class="trip-card-btns">';
        html += '<button class="btn small primary" onclick="viewTrip(\'' + t.id + '\')">📍 View</button>';
        html += '<button class="btn small" onclick="deleteTrip(\'' + t.id + '\')">🗑️ Delete</button>';
        html += '</div></div></div>';
    }
    container.innerHTML = html;
}

function filterTrips(filter, btn) {
    var btns = document.querySelectorAll('.filterbtn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
    }
    btn.classList.add('active');
    renderTrips(filter);
}

function deleteTrip(tripId) {
    if (!confirm('🗑️ Delete this trip and all its expenses?')) { return; }
    allTrips = allTrips.filter(function(t) { return t.id !== tripId; });
    saveTripsToStorage();
    renderTrips();
    updateDashboard();
    toast('Trip deleted!', 'info');
}

// ============ TRIP DETAIL VIEW ============
function viewTrip(tripId) {
    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { toast('Trip not found!', 'err'); return; }

    currentTripId = tripId;
    navigate('tripview');

    document.getElementById('tvTitle').textContent = trip.type.split(' ')[0] + ' ' + trip.name;

    var status = getTripStatus(trip);
    var spent = getTripSpent(trip);
    var remaining = trip.budget - spent;

    var headerHtml = '<h2>' + trip.name + '</h2>';
    headerHtml += '<p style="color:var(--txt2);margin-bottom:12px;">📍 ' + trip.destination + ' · ' + getTripStatusLabel(status) + '</p>';
    headerHtml += '<div class="trip-detail-stats">';
    headerHtml += '<div class="td-stat"><span>📅 ' + trip.days + '</span><span>Days</span></div>';
    headerHtml += '<div class="td-stat"><span>' + trip.currency + (trip.budget || 0).toLocaleString() + '</span><span>Budget</span></div>';
    headerHtml += '<div class="td-stat"><span>' + trip.currency + spent.toLocaleString() + '</span><span>Spent</span></div>';
    headerHtml += '<div class="td-stat"><span>' + trip.currency + Math.max(0, remaining).toLocaleString() + '</span><span>Remaining</span></div>';
    headerHtml += '</div>';

    if (trip.notes) {
        headerHtml += '<p style="margin-top:10px;font-size:0.82rem;color:var(--txt2);">📝 ' + trip.notes + '</p>';
    }

    document.getElementById('tvHeader').innerHTML = headerHtml;

    renderItinerary(trip);
    renderTripExpenses(trip);
}

// ============ ITINERARY ============
function renderItinerary(trip) {
    var container = document.getElementById('tvItinerary');
    if (!trip.itinerary || trip.itinerary.length === 0) {
        container.innerHTML = '<p class="placeholder">No itinerary yet!</p>';
        return;
    }

    var html = '';
    for (var d = 0; d < trip.itinerary.length; d++) {
        var day = trip.itinerary[d];
        html += '<div class="day-card">';
        html += '<h4>Day ' + day.day + ' — ' + day.date + '</h4>';

        if (day.activities && day.activities.length > 0) {
            for (var a = 0; a < day.activities.length; a++) {
                var act = day.activities[a];
                var doneClass = act.done ? 'done' : '';
                html += '<div class="activity-item ' + doneClass + '">';
                html += '<input type="checkbox" class="activity-check" ' + (act.done ? 'checked' : '') + ' onchange="toggleActivity(\'' + trip.id + '\',' + d + ',' + a + ')">';
                html += '<span>' + act.text + '</span>';
                html += '<button class="btn small" style="background:var(--coral);padding:2px 6px;font-size:0.6rem;margin-left:auto;" onclick="deleteActivity(\'' + trip.id + '\',' + d + ',' + a + ')">✕</button>';
                html += '</div>';
            }
        }

        html += '<div class="add-activity-row">';
        html += '<input type="text" class="add-activity-input" id="actInput' + d + '" placeholder="Add activity..." onkeydown="if(event.key===\'Enter\')addActivity(\'' + trip.id + '\',' + d + ')">';
        html += '<button class="btn small primary" onclick="addActivity(\'' + trip.id + '\',' + d + ')">➕</button>';
        html += '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function addActivity(tripId, dayIndex) {
    var input = document.getElementById('actInput' + dayIndex);
    var text = input.value.trim();
    if (!text) { return; }

    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { return; }

    trip.itinerary[dayIndex].activities.push({ text: text, done: false });
    saveTripsToStorage();
    input.value = '';
    renderItinerary(trip);
    toast('Activity added!', 'ok');
}

function toggleActivity(tripId, dayIndex, actIndex) {
    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { return; }
    trip.itinerary[dayIndex].activities[actIndex].done = !trip.itinerary[dayIndex].activities[actIndex].done;
    saveTripsToStorage();
    renderItinerary(trip);
}

function deleteActivity(tripId, dayIndex, actIndex) {
    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { return; }
    trip.itinerary[dayIndex].activities.splice(actIndex, 1);
    saveTripsToStorage();
    renderItinerary(trip);
}

function addItineraryDay() {
    var trip = allTrips.find(function(t) { return t.id === currentTripId; });
    if (!trip) { return; }
    var nextDay = trip.itinerary.length + 1;
    trip.itinerary.push({ day: nextDay, date: 'Day ' + nextDay, activities: [] });
    trip.days = trip.itinerary.length;
    saveTripsToStorage();
    renderItinerary(trip);
    toast('Day ' + nextDay + ' added!', 'ok');
}

// ============ EXPENSES ============
function openExpenseForm() {
    document.getElementById('expenseForm').style.display = 'block';
    var trip = allTrips.find(function(t) { return t.id === currentTripId; });
    if (trip) {
        document.getElementById('expDate').value = trip.startDate;
    }
}

function closeExpenseForm() {
    document.getElementById('expenseForm').style.display = 'none';
}

function addExpense() {
    var desc = document.getElementById('expDesc').value.trim();
    var amount = parseFloat(document.getElementById('expAmount').value);
    var category = document.getElementById('expCategory').value;
    var date = document.getElementById('expDate').value;

    if (!desc) { toast('Enter description!', 'warn'); return; }
    if (!amount || amount <= 0) { toast('Enter valid amount!', 'warn'); return; }

    var trip = allTrips.find(function(t) { return t.id === currentTripId; });
    if (!trip) { toast('Trip not found!', 'err'); return; }

    trip.expenses.push({
        id: 'exp_' + Date.now(),
        desc: desc,
        amount: amount,
        category: category,
        date: date || new Date().toLocaleDateString()
    });

    saveTripsToStorage();
    closeExpenseForm();
    document.getElementById('expDesc').value = '';
    document.getElementById('expAmount').value = '';
    renderTripExpenses(trip);
    viewTrip(currentTripId);
    toast('Expense added! 💰', 'ok');
}

function deleteExpense(tripId, expId) {
    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { return; }
    trip.expenses = trip.expenses.filter(function(e) { return e.id !== expId; });
    saveTripsToStorage();
    renderTripExpenses(trip);
    viewTrip(tripId);
}

function renderTripExpenses(trip) {
    // Category summary
    var categories = {};
    for (var i = 0; i < trip.expenses.length; i++) {
        var exp = trip.expenses[i];
        var cat = exp.category;
        if (!categories[cat]) { categories[cat] = 0; }
        categories[cat] += exp.amount;
    }

    var summaryHtml = '';
    for (var cat in categories) {
        summaryHtml += '<div class="exp-cat-card">';
        summaryHtml += '<span>' + cat + '</span>';
        summaryHtml += '<span>' + trip.currency + categories[cat].toLocaleString() + '</span>';
        summaryHtml += '</div>';
    }
    document.getElementById('tvExpenseSummary').innerHTML = summaryHtml;

    // Expense list
    var listHtml = '';
    if (trip.expenses.length === 0) {
        listHtml = '<p class="placeholder">No expenses yet. Click ➕ to add!</p>';
    } else {
        for (var j = trip.expenses.length - 1; j >= 0; j--) {
            var e = trip.expenses[j];
            var catIcon = e.category.split(' ')[0];
            listHtml += '<div class="expense-item">';
            listHtml += '<div class="expense-item-left">';
            listHtml += '<span class="expense-item-cat">' + catIcon + '</span>';
            listHtml += '<div class="expense-item-info"><h4>' + e.desc + '</h4><p>' + e.category + ' · ' + e.date + '</p></div>';
            listHtml += '</div>';
            listHtml += '<span class="expense-item-amount">' + trip.currency + e.amount.toLocaleString() + '</span>';
            listHtml += '<button class="expense-item-del" onclick="deleteExpense(\'' + trip.id + '\',\'' + e.id + '\')">✕</button>';
            listHtml += '</div>';
        }
    }
    document.getElementById('tvExpenseList').innerHTML = listHtml;
}

// ============ ALL EXPENSES ============
function renderAllExpenses() {
    var totalSpent = 0;
    var totalBudget = 0;
    var allExp = [];
    var catTotals = {};

    for (var i = 0; i < allTrips.length; i++) {
        var trip = allTrips[i];
        totalBudget += trip.budget || 0;
        if (trip.expenses) {
            for (var j = 0; j < trip.expenses.length; j++) {
                var exp = trip.expenses[j];
                totalSpent += exp.amount;
                allExp.push({ trip: trip.name, currency: trip.currency, expense: exp });

                var catName = exp.category;
                if (!catTotals[catName]) { catTotals[catName] = 0; }
                catTotals[catName] += exp.amount;
            }
        }
    }

    document.getElementById('totalSpentAll').textContent = '₹' + totalSpent.toLocaleString();
    document.getElementById('totalBudgetAll').textContent = '₹' + totalBudget.toLocaleString();
    document.getElementById('totalRemainingAll').textContent = '₹' + Math.max(0, totalBudget - totalSpent).toLocaleString();

    // Category chart
    var chartHtml = '';
    var maxCatAmount = 0;
    for (var cat in catTotals) {
        if (catTotals[cat] > maxCatAmount) { maxCatAmount = catTotals[cat]; }
    }

    for (var catKey in catTotals) {
        var percent = maxCatAmount > 0 ? Math.round(catTotals[catKey] / maxCatAmount * 100) : 0;
        chartHtml += '<div class="cat-bar-row">';
        chartHtml += '<span class="cat-bar-label">' + catKey + '</span>';
        chartHtml += '<div class="cat-bar-track"><div class="cat-bar-fill" style="width:' + percent + '%;">₹' + catTotals[catKey].toLocaleString() + '</div></div>';
        chartHtml += '</div>';
    }

    if (!chartHtml) { chartHtml = '<p class="placeholder">No expenses to show!</p>'; }
    document.getElementById('categoryChart').innerHTML = chartHtml;

    // All expenses list
    var listHtml = '';
    if (allExp.length === 0) {
        listHtml = '<p class="placeholder">No expenses recorded yet!</p>';
    } else {
        for (var k = allExp.length - 1; k >= 0; k--) {
            var item = allExp[k];
            var catIcon = item.expense.category.split(' ')[0];
            listHtml += '<div class="expense-item">';
            listHtml += '<div class="expense-item-left">';
            listHtml += '<span class="expense-item-cat">' + catIcon + '</span>';
            listHtml += '<div class="expense-item-info"><h4>' + item.expense.desc + '</h4><p>' + item.trip + ' · ' + item.expense.date + '</p></div>';
            listHtml += '</div>';
            listHtml += '<span class="expense-item-amount">' + item.currency + item.expense.amount.toLocaleString() + '</span>';
            listHtml += '</div>';
        }
    }
    document.getElementById('allExpensesList').innerHTML = listHtml;
}

// ============ MAP ============
var travelMap = null;
var mapMarkers = [];

function initMap() {
    var mapDiv = document.getElementById('travelMap');
    if (!mapDiv) { return; }

    if (travelMap) {
        travelMap.remove();
        travelMap = null;
    }

    travelMap = L.map('travelMap').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(travelMap);

    // Add markers for each trip
    renderMapMarkers();
    renderPlacesList();
}

function renderMapMarkers() {
    if (!travelMap) { return; }

    // Clear existing markers
    for (var i = 0; i < mapMarkers.length; i++) {
        travelMap.removeLayer(mapMarkers[i]);
    }
    mapMarkers = [];

    // Add markers for trips using geocoding
    for (var j = 0; j < allTrips.length; j++) {
        var trip = allTrips[j];
        geocodeAndMark(trip);
    }
}

function geocodeAndMark(trip) {
    var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(trip.destination);

    fetch(url).then(function(res) {
        return res.json();
    }).then(function(data) {
        if (data && data.length > 0) {
            var lat = parseFloat(data[0].lat);
            var lon = parseFloat(data[0].lon);

            var marker = L.marker([lat, lon]).addTo(travelMap);
            marker.bindPopup('<b>' + trip.name + '</b><br>📍 ' + trip.destination + '<br>📅 ' + trip.startDate + '<br>' + trip.type);
            mapMarkers.push(marker);

            // Save coordinates
            trip.lat = lat;
            trip.lon = lon;
            saveTripsToStorage();
        }
    }).catch(function(err) {
        console.log('Geocode error for ' + trip.destination);
    });
}

function renderPlacesList() {
    var container = document.getElementById('placesList');
    if (allTrips.length === 0) {
        container.innerHTML = '<p class="placeholder">Add trips to see places on the map!</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < allTrips.length; i++) {
        var t = allTrips[i];
        html += '<div class="place-item">';
        html += '<div>';
        html += '<h4>' + t.type.split(' ')[0] + ' ' + t.destination + '</h4>';
        html += '<p>' + t.name + ' · ' + t.startDate + '</p>';
        html += '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// ============ CURRENCY CONVERTER ============
var exchangeRates = {
    INR: 1,
    USD: 0.0119,
    EUR: 0.0109,
    GBP: 0.0094,
    JPY: 1.78,
    AUD: 0.0183,
    CAD: 0.0163,
    THB: 0.41,
    SGD: 0.016,
    AED: 0.0437,
    MYR: 0.053,
    LKR: 3.55
};

var currencyFlags = {
    INR: '🇮🇳', USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧',
    JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦', THB: '🇹🇭',
    SGD: '🇸🇬', AED: '🇦🇪', MYR: '🇲🇾', LKR: '🇱🇰'
};

var currencyNames = {
    INR: 'Indian Rupee', USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound',
    JPY: 'Japanese Yen', AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
    THB: 'Thai Baht', SGD: 'Singapore Dollar', AED: 'UAE Dirham',
    MYR: 'Malaysian Ringgit', LKR: 'Sri Lankan Rupee'
};

function convertCurrency() {
    var amount = parseFloat(document.getElementById('currAmount').value) || 0;
    var from = document.getElementById('currFrom').value;
    var to = document.getElementById('currTo').value;

    // Convert to INR first, then to target
    var inINR = amount / exchangeRates[from];
    var result = inINR * exchangeRates[to];

    document.getElementById('convertFrom').textContent = amount.toLocaleString() + ' ' + from;
    document.getElementById('convertTo').textContent = '= ' + result.toFixed(2).toLocaleString() + ' ' + to;
}

function swapCurrency() {
    var fromSel = document.getElementById('currFrom');
    var toSel = document.getElementById('currTo');
    var temp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = temp;
    convertCurrency();
}

function renderCurrencyTable() {
    var container = document.getElementById('currencyTable');
    var html = '';

    for (var code in exchangeRates) {
        if (code === 'INR') { continue; }
        var rate = exchangeRates[code];
        var oneUnit = (1 / rate).toFixed(2);

        html += '<div class="curr-row">';
        html += '<span><span class="curr-flag">' + (currencyFlags[code] || '') + '</span> ' + code + ' — ' + currencyNames[code] + '</span>';
        html += '<span class="curr-rate">1 ' + code + ' = ₹' + oneUnit + '</span>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// Try to fetch live rates
function fetchLiveRates() {
    fetch('https://api.exchangerate-api.com/v4/latest/INR').then(function(res) {
        return res.json();
    }).then(function(data) {
        if (data && data.rates) {
            for (var code in exchangeRates) {
                if (data.rates[code]) {
                    exchangeRates[code] = data.rates[code];
                }
            }
            console.log('Live rates loaded!');
        }
    }).catch(function(err) {
        console.log('Using offline rates');
    });
}

// ============ BUCKET LIST ============
function addBucketItem() {
    document.getElementById('bucketForm').style.display = 'block';
}

function closeBucketForm() {
    document.getElementById('bucketForm').style.display = 'none';
}

function saveBucketItem() {
    var place = document.getElementById('bucketPlace').value.trim();
    var reason = document.getElementById('bucketReason').value.trim();

    if (!place) { toast('Enter a place!', 'warn'); return; }

    bucketList.push({
        id: 'bk_' + Date.now(),
        place: place,
        reason: reason,
        done: false
    });

    localStorage.setItem('tlBucket', JSON.stringify(bucketList));
    document.getElementById('bucketPlace').value = '';
    document.getElementById('bucketReason').value = '';
    closeBucketForm();
    renderBucket();
    toast('Added to bucket list! 🎯', 'ok');
}

function toggleBucket(id) {
    for (var i = 0; i < bucketList.length; i++) {
        if (bucketList[i].id === id) {
            bucketList[i].done = !bucketList[i].done;
            break;
        }
    }
    localStorage.setItem('tlBucket', JSON.stringify(bucketList));
    renderBucket();
}

function deleteBucket(id) {
    bucketList = bucketList.filter(function(b) { return b.id !== id; });
    localStorage.setItem('tlBucket', JSON.stringify(bucketList));
    renderBucket();
}

function renderBucket() {
    var container = document.getElementById('bucketList');
    if (bucketList.length === 0) {
        container.innerHTML = '<p class="placeholder">Your bucket list is empty! Add places you dream of visiting! 🌍</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < bucketList.length; i++) {
        var b = bucketList[i];
        var doneClass = b.done ? 'done' : '';
        html += '<div class="bucket-item ' + doneClass + '">';
        html += '<input type="checkbox" class="bucket-check" ' + (b.done ? 'checked' : '') + ' onchange="toggleBucket(\'' + b.id + '\')">';
        html += '<div class="bucket-text">';
        html += '<h4>' + (b.done ? '✅ ' : '🎯 ') + b.place + '</h4>';
        if (b.reason) { html += '<p>' + b.reason + '</p>'; }
        html += '</div>';
        html += '<button class="bucket-del" onclick="deleteBucket(\'' + b.id + '\')">✕</button>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// ============ INIT ============
window.onload = function() {
    console.log('TravelLog starting...');

    // Check saved name
    var savedName = localStorage.getItem('tlName');
    if (savedName) {
        var popup = document.getElementById('loginPopup');
        if (popup) { popup.classList.add('hidden'); }
        updateGreeting();
    }

    // Apply theme
    if (localStorage.getItem('tlTheme') === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('.themebtn').textContent = '☀️';
    } else {
        applyTimeTheme();
    }

    // Update theme every minute
    setInterval(function() {
        if (!document.body.classList.contains('dark-theme')) {
            applyTimeTheme();
            updateGreeting();
        }
    }, 60000);

    // Load data
    updateDashboard();
    renderRecentTrips();

    // Fetch live currency rates
    fetchLiveRates();

    toast('TravelLog ready! 🌊', 'ok');
};