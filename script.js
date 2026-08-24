// =============================================
//  TRAVELLOG — Groups, Chat & Expense Split
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

// ============ STATE ============
var allTrips = JSON.parse(localStorage.getItem('tlTrips') || '[]');
var bucketList = JSON.parse(localStorage.getItem('tlBucket') || '[]');
var currentTripId = null;
var currentGroupId = null;
var currentUser = null;
var myGroups = [];
var chatListener = null;

// ============ NAVIGATION ============
function navigate(pageId) {
    var pages = document.querySelectorAll('.pg');
    for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove('show');
    }
    document.getElementById(pageId).classList.add('show');
    window.scrollTo(0, 0);

    if (pageId === 'home') {
        updateDashboard();
        renderRecentTrips();
    }
    if (pageId === 'trips') { renderTrips(); }
    if (pageId === 'expenses') { renderAllExpenses(); }
    if (pageId === 'map') { setTimeout(initMap, 300); }
    if (pageId === 'currency') { convertCurrency(); renderCurrencyTable(); }
    if (pageId === 'bucket') { renderBucket(); }
    if (pageId === 'groups') { loadMyGroups(); }
    if (pageId === 'newtrip') { populateGroupSelect(); }
}

// ============ THEME ============
function applyTimeTheme() {
    var hour = new Date().getHours();
    var body = document.body;
    body.classList.remove('theme-morning', 'theme-afternoon', 'theme-evening', 'theme-night');
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

// ============ AUTH ============
function signInGoogle() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(function(result) {
        currentUser = result.user;
        onUserLoggedIn(currentUser);
        toast('Welcome, ' + currentUser.displayName.split(' ')[0] + '! 🌊', 'ok');
    }).catch(function(err) {
        console.error('Auth error:', err);
        toast('Sign in failed: ' + err.message, 'err');
    });
}

function signOutUser() {
    auth.signOut().then(function() {
        currentUser = null;
        document.getElementById('loginPopup').classList.remove('hidden');
        var userArea = document.getElementById('userArea');
        if (userArea) { userArea.style.display = 'none'; }
        toast('Signed out!', 'info');
    });
}

function onUserLoggedIn(user) {
    currentUser = user;
    document.getElementById('loginPopup').classList.add('hidden');

    // Show user in navbar
    var userArea = document.getElementById('userArea');
    if (userArea) { userArea.style.display = 'flex'; }
    var pic = document.getElementById('userPic');
    if (pic && user.photoURL) { pic.src = user.photoURL; }
    var name = document.getElementById('userName');
    if (name) { name.textContent = user.displayName ? user.displayName.split(' ')[0] : 'User'; }

    // Save user to Firestore
    db.collection('users').doc(user.uid).set({
        name: user.displayName || 'User',
        email: user.email || '',
        photo: user.photoURL || '',
        uid: user.uid
    }, { merge: true });

    updateGreeting();
    loadMyGroups();
}

function updateGreeting() {
    var name = '';
    if (currentUser && currentUser.displayName) {
        name = currentUser.displayName.split(' ')[0];
    }
    if (!name) { return; }

    var hour = new Date().getHours();
    var g = '';
    var m = '';

    if (hour >= 5 && hour < 12) {
        g = '🌅 Good Morning, ' + name + '!';
        m = 'A perfect day for an adventure!';
    } else if (hour >= 12 && hour < 17) {
        g = '☀️ Good Afternoon, ' + name + '!';
        m = 'Where will the sun take you today?';
    } else if (hour >= 17 && hour < 21) {
        g = '🌇 Good Evening, ' + name + '!';
        m = 'Golden hour — time to explore!';
    } else {
        g = '🌙 Good Night, ' + name + '!';
        m = 'Dream of your next destination! ✨';
    }

    var greetEl = document.getElementById('heroGreeting');
    var msgEl = document.getElementById('heroMessage');
    if (greetEl) { greetEl.textContent = g; }
    if (msgEl) { msgEl.textContent = m; }
}

// ============ DASHBOARD ============
function updateDashboard() {
    var totalSpent = 0;
    var totalDays = 0;

    for (var i = 0; i < allTrips.length; i++) {
        var trip = allTrips[i];
        if (trip.expenses) {
            for (var j = 0; j < trip.expenses.length; j++) {
                totalSpent += trip.expenses[j].amount || 0;
            }
        }
        if (trip.startDate && trip.endDate) {
            var s = new Date(trip.startDate);
            var e = new Date(trip.endDate);
            var d = Math.ceil((e - s) / 86400000) + 1;
            if (d > 0) { totalDays += d; }
        }
    }

    document.getElementById('stTrips').textContent = allTrips.length;
    document.getElementById('stPlaces').textContent = allTrips.length;
    document.getElementById('stSpent').textContent = '₹' + totalSpent.toLocaleString();
    document.getElementById('stGroups').textContent = myGroups.length;
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
        html += '<div class="trip-card" style="margin-bottom:10px;cursor:pointer;" onclick="viewTrip(\'' + t.id + '\')">';
        html += '<div class="trip-card-top" style="background:linear-gradient(135deg,' + getTripColor(t.type) + ')">';
        html += '<h3>' + t.name + '</h3>';
        html += '<p>📍 ' + t.destination + ' · ' + t.type + '</p>';
        html += '</div>';
        html += '<div class="trip-card-bot">';
        html += '<div class="trip-card-meta"><span>📅 ' + t.startDate + '</span><span>💰 ₹' + spent.toLocaleString() + '</span></div>';
        html += '</div></div>';
    }
    container.innerHTML = html;
}

// ============ TRIPS ============
function saveTrip() {
    var name = document.getElementById('tripName').value.trim();
    var dest = document.getElementById('tripDest').value.trim();
    var start = document.getElementById('tripStart').value;
    var end = document.getElementById('tripEnd').value;
    var type = document.getElementById('tripType').value;
    var notes = document.getElementById('tripNotes').value.trim();
    var groupId = document.getElementById('tripGroup').value;
    var travelerMode = document.querySelector('input[name="travelerMode"]:checked').value;

    if (!name) { toast('Enter trip name!', 'warn'); return; }
    if (!dest) { toast('Enter destination!', 'warn'); return; }
    if (!start || !end) { toast('Pick dates!', 'warn'); return; }
    if (travelerMode === 'group' && !groupId) { toast('Select a travel group!', 'warn'); return; }

    var startDate = new Date(start);
    var endDate = new Date(end);
    if (endDate < startDate) { toast('End date must be after start!', 'warn'); return; }

    var days = Math.ceil((endDate - startDate) / 86400000) + 1;

    var trip = {
        id: 'trip_' + Date.now(),
        name: name,
        destination: dest,
        startDate: start,
        endDate: end,
        days: days,
        type: type,
        notes: notes,
        travelerMode: travelerMode,
        groupId: groupId || null,
        expenses: [],
        itinerary: [],
        createdAt: new Date().toLocaleDateString()
    };

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
    saveTripsLocal();
    toast('Trip "' + name + '" created! ✈️', 'ok');

    document.getElementById('tripName').value = '';
    document.getElementById('tripDest').value = '';
    document.getElementById('tripStart').value = '';
    document.getElementById('tripEnd').value = '';
    document.getElementById('tripNotes').value = '';

    navigate('trips');
}

function saveTripsLocal() {
    localStorage.setItem('tlTrips', JSON.stringify(allTrips));
}

function getTripStatus(trip) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var s = new Date(trip.startDate);
    var e = new Date(trip.endDate);
    if (today < s) { return 'upcoming'; }
    if (today > e) { return 'completed'; }
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
        '🎢 Adventure': '#e11d48,#f43f5e'
    };
    return colors[type] || '#0ea5e9,#06b6d4';
}

function renderTrips(filter) {
    var container = document.getElementById('tripsList');
    if (allTrips.length === 0) {
        container.innerHTML = '<p class="placeholder">No trips yet! ✈️</p>';
        return;
    }
    var list = allTrips;
    if (filter && filter !== 'all') {
        list = allTrips.filter(function(t) { return getTripStatus(t) === filter; });
    }
    if (list.length === 0) {
        container.innerHTML = '<p class="placeholder">No ' + filter + ' trips!</p>';
        return;
    }
    var html = '';
    for (var i = list.length - 1; i >= 0; i--) {
        var t = list[i];
        var status = getTripStatus(t);
        var spent = getTripSpent(t);
        html += '<div class="trip-card">';
        html += '<div class="trip-card-top" style="background:linear-gradient(135deg,' + getTripColor(t.type) + ')">';
        html += '<span class="trip-status">' + getTripStatusLabel(status) + '</span>';
        html += '<h3>' + t.name + '</h3>';
        html += '<p>📍 ' + t.destination + ' · ' + t.type + '</p></div>';
        html += '<div class="trip-card-bot">';
        html += '<div class="trip-card-meta"><span>📅 ' + t.startDate + ' → ' + t.endDate + '</span><span>' + t.days + ' days</span></div>';
        html += '<div class="trip-card-meta"><span>💰 ₹' + spent.toLocaleString() + '</span></div>';
        html += '<div class="trip-card-btns">';
        html += '<button class="btn small primary" onclick="viewTrip(\'' + t.id + '\')">📍 View</button>';
        html += '<button class="btn small danger" onclick="deleteTrip(\'' + t.id + '\')">🗑️</button>';
        html += '</div></div></div>';
    }
    container.innerHTML = html;
}

function filterTrips(filter, btn) {
    var btns = document.querySelectorAll('.filterbtn');
    for (var i = 0; i < btns.length; i++) { btns[i].classList.remove('active'); }
    btn.classList.add('active');
    renderTrips(filter);
}

function deleteTrip(id) {
    if (!confirm('🗑️ Delete this trip?')) { return; }
    allTrips = allTrips.filter(function(t) { return t.id !== id; });
    saveTripsLocal();
    renderTrips();
    updateDashboard();
    toast('Deleted!', 'info');
}

function populateGroupSelect() {
    var sel = document.getElementById('tripGroup');
    if (!sel) { return; }
    sel.innerHTML = '<option value="">No group — personal trip</option>';
    for (var i = 0; i < myGroups.length; i++) {
        var g = myGroups[i];
        var opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = '👥 ' + g.name;
        sel.appendChild(opt);
    }
    toggleTravelerMode();
}

function toggleTravelerMode() {
    var modeInput = document.querySelector('input[name="travelerMode"]:checked');
    var mode = modeInput ? modeInput.value : 'individual';
    var groupSelect = document.getElementById('tripGroup');
    var groupLabel = document.getElementById('tripGroupLabel');
    var hint = document.getElementById('travelerModeHint');
    var individualOption = document.getElementById('individualOption');
    var groupOption = document.getElementById('groupOption');
    if (!groupSelect || !groupLabel || !hint) { return; }

    groupSelect.classList.toggle('hidden-field', mode !== 'group');
    groupLabel.classList.toggle('hidden-field', mode !== 'group');
    hint.textContent = mode === 'group'
        ? 'Choose a group to share expenses and settle up together.'
        : 'You are the only traveler. Expenses stay personal.';
    if (individualOption) { individualOption.classList.toggle('selected', mode === 'individual'); }
    if (groupOption) { groupOption.classList.toggle('selected', mode === 'group'); }
    if (mode !== 'group') { groupSelect.value = ''; }
}

// ============ TRIP VIEW ============
function viewTrip(tripId) {
    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { toast('Not found!', 'err'); return; }
    currentTripId = tripId;
    navigate('tripview');

    document.getElementById('tvTitle').textContent = trip.type.split(' ')[0] + ' ' + trip.name;

    var spent = getTripSpent(trip);
    var status = getTripStatus(trip);

    var h = '<h2>' + trip.name + '</h2>';
    h += '<p style="color:var(--txt2);margin-bottom:12px;">📍 ' + trip.destination + ' · ' + getTripStatusLabel(status) + '</p>';
    h += '<p class="traveler-badge">' + (trip.travelerMode === 'group' || trip.groupId ? '👥 Group trip' : '🧍 Personal trip') + '</p>';
    h += '<div class="trip-detail-stats">';
    h += '<div class="td-stat"><span>📅 ' + trip.days + '</span><span>Days</span></div>';
    h += '<div class="td-stat"><span>₹' + spent.toLocaleString() + '</span><span>Spent</span></div>';
    h += '<div class="td-stat"><span>' + (trip.expenses ? trip.expenses.length : 0) + '</span><span>Expenses</span></div>';
    h += '</div>';
    if (trip.notes) { h += '<p style="margin-top:10px;font-size:0.82rem;color:var(--txt2);">📝 ' + trip.notes + '</p>'; }
    document.getElementById('tvHeader').innerHTML = h;

    renderItinerary(trip);
    renderTripExpenses(trip);
}

// ============ ITINERARY ============
function renderItinerary(trip) {
    var container = document.getElementById('tvItinerary');
    if (!trip.itinerary || trip.itinerary.length === 0) {
        container.innerHTML = '<p class="placeholder">No itinerary!</p>';
        return;
    }
    var html = '';
    for (var d = 0; d < trip.itinerary.length; d++) {
        var day = trip.itinerary[d];
        html += '<div class="day-card"><h4>Day ' + day.day + ' — ' + day.date + '</h4>';
        if (day.activities) {
            for (var a = 0; a < day.activities.length; a++) {
                var act = day.activities[a];
                html += '<div class="activity-item ' + (act.done ? 'done' : '') + '">';
                html += '<input type="checkbox" class="activity-check" ' + (act.done ? 'checked' : '') + ' onchange="toggleActivity(\'' + trip.id + '\',' + d + ',' + a + ')">';
                html += '<span>' + act.text + '</span>';
                html += '<button class="btn small" style="background:var(--coral);padding:2px 6px;font-size:0.6rem;margin-left:auto;" onclick="deleteActivity(\'' + trip.id + '\',' + d + ',' + a + ')">✕</button>';
                html += '</div>';
            }
        }
        html += '<div class="add-activity-row">';
        html += '<input type="text" class="add-activity-input" id="actInput' + d + '" placeholder="Add activity..." onkeydown="if(event.key===\'Enter\')addActivity(\'' + trip.id + '\',' + d + ')">';
        html += '<button class="btn small primary" onclick="addActivity(\'' + trip.id + '\',' + d + ')">➕</button>';
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function addActivity(tripId, dayIdx) {
    var input = document.getElementById('actInput' + dayIdx);
    var text = input.value.trim();
    if (!text) { return; }
    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { return; }
    trip.itinerary[dayIdx].activities.push({ text: text, done: false });
    saveTripsLocal();
    input.value = '';
    renderItinerary(trip);
}

function toggleActivity(tripId, dayIdx, actIdx) {
    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { return; }
    trip.itinerary[dayIdx].activities[actIdx].done = !trip.itinerary[dayIdx].activities[actIdx].done;
    saveTripsLocal();
    renderItinerary(trip);
}

function deleteActivity(tripId, dayIdx, actIdx) {
    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { return; }
    trip.itinerary[dayIdx].activities.splice(actIdx, 1);
    saveTripsLocal();
    renderItinerary(trip);
}

function addItineraryDay() {
    var trip = allTrips.find(function(t) { return t.id === currentTripId; });
    if (!trip) { return; }
    var next = trip.itinerary.length + 1;
    trip.itinerary.push({ day: next, date: 'Day ' + next, activities: [] });
    trip.days = trip.itinerary.length;
    saveTripsLocal();
    renderItinerary(trip);
    toast('Day ' + next + ' added!', 'ok');
}

// ============ EXPENSES ============
function openExpenseForm() {
    document.getElementById('expenseForm').style.display = 'block';
    populateExpensePaidBy();
    populateExpenseSplit();
}

function closeExpenseForm() {
    document.getElementById('expenseForm').style.display = 'none';
}

function populateExpensePaidBy() {
    var sel = document.getElementById('expPaidBy');
    sel.innerHTML = '<option value="me">Me</option>';

    var trip = allTrips.find(function(t) { return t.id === currentTripId; });
    if (trip && trip.groupId) {
        var group = myGroups.find(function(g) { return g.id === trip.groupId; });
        if (group && group.members) {
            for (var i = 0; i < group.members.length; i++) {
                var m = group.members[i];
                if (currentUser && m.uid !== currentUser.uid) {
                    var opt = document.createElement('option');
                    opt.value = m.uid;
                    opt.textContent = m.name;
                    sel.appendChild(opt);
                }
            }
        }
    }
}

function populateExpenseSplit() {
    var container = document.getElementById('expSplitMembers');
    container.innerHTML = '';

    var trip = allTrips.find(function(t) { return t.id === currentTripId; });
    if (!trip || !trip.groupId) {
        container.innerHTML = '<p class="small">Personal trip — no split needed</p>';
        return;
    }

    var group = myGroups.find(function(g) { return g.id === trip.groupId; });
    if (!group || !group.members) { return; }

    for (var i = 0; i < group.members.length; i++) {
        var m = group.members[i];
        var html = '<label class="split-member">';
        html += '<input type="checkbox" checked data-uid="' + m.uid + '" data-name="' + m.name + '">';
        if (m.photo) { html += '<img src="' + m.photo + '" alt="">'; }
        html += '<span>' + m.name.split(' ')[0] + '</span></label>';
        container.innerHTML += html;
    }
}

function addExpense() {
    var desc = document.getElementById('expDesc').value.trim();
    var amount = parseFloat(document.getElementById('expAmount').value);
    var category = document.getElementById('expCategory').value;
    var paidBy = document.getElementById('expPaidBy').value;

    if (!desc) { toast('Enter description!', 'warn'); return; }
    if (!amount || amount <= 0) { toast('Enter valid amount!', 'warn'); return; }

    var trip = allTrips.find(function(t) { return t.id === currentTripId; });
    if (!trip) { toast('Open a trip before adding an expense.', 'warn'); return; }
    if (!trip.expenses) { trip.expenses = []; }

    // Get split members
    var splitWith = [];
    var checkboxes = document.querySelectorAll('#expSplitMembers input[type="checkbox"]:checked');
    for (var i = 0; i < checkboxes.length; i++) {
        splitWith.push({
            uid: checkboxes[i].getAttribute('data-uid'),
            name: checkboxes[i].getAttribute('data-name')
        });
    }

    var paidByName = 'Me';
    if (paidBy !== 'me' && currentUser) {
        var selOpt = document.getElementById('expPaidBy');
        paidByName = selOpt.options[selOpt.selectedIndex].textContent;
    }

    var expense = {
        id: 'exp_' + Date.now(),
        desc: desc,
        amount: amount,
        category: category,
        paidBy: paidBy,
        paidByName: paidByName,
        splitWith: splitWith,
        date: new Date().toLocaleDateString()
    };
    trip.expenses.push(expense);

    saveTripsLocal();
    closeExpenseForm();
    document.getElementById('expDesc').value = '';
    document.getElementById('expAmount').value = '';

    // If group trip, save expense to Firestore
    if (trip.groupId && currentUser) {
        var expData = trip.expenses[trip.expenses.length - 1];
        expData.tripName = trip.name;
        expData.paidByUid = paidBy === 'me' ? currentUser.uid : paidBy;
        db.collection('groups').doc(trip.groupId).collection('expenses').add(expData);
    }

    viewTrip(currentTripId);
    toast('Expense added! 💰', 'ok');
}

function openAllExpenseForm() {
    var form = document.getElementById('allExpenseForm');
    var select = document.getElementById('allExpTrip');
    if (!form || !select) { return; }
    if (allTrips.length === 0) {
        toast('Create a trip before adding an expense.', 'warn');
        navigate('newtrip');
        return;
    }

    select.innerHTML = '';
    for (var i = 0; i < allTrips.length; i++) {
        var option = document.createElement('option');
        option.value = allTrips[i].id;
        option.textContent = allTrips[i].name + ' — ' + allTrips[i].destination;
        select.appendChild(option);
    }
    if (currentTripId && allTrips.some(function(t) { return t.id === currentTripId; })) {
        select.value = currentTripId;
    }
    form.style.display = 'block';
}

function closeAllExpenseForm() {
    var form = document.getElementById('allExpenseForm');
    if (form) { form.style.display = 'none'; }
}

function addExpenseFromAll() {
    var tripId = document.getElementById('allExpTrip').value;
    var desc = document.getElementById('allExpDesc').value.trim();
    var amount = parseFloat(document.getElementById('allExpAmount').value);
    var category = document.getElementById('allExpCategory').value;
    var trip = allTrips.find(function(t) { return t.id === tripId; });

    if (!trip) { toast('Select a trip!', 'warn'); return; }
    if (!desc) { toast('Enter description!', 'warn'); return; }
    if (!amount || amount <= 0) { toast('Enter valid amount!', 'warn'); return; }
    if (!trip.expenses) { trip.expenses = []; }

    var expense = {
        id: 'exp_' + Date.now(),
        desc: desc,
        amount: amount,
        category: category,
        paidBy: 'me',
        paidByName: 'Me',
        splitWith: [],
        date: new Date().toLocaleDateString()
    };
    if (trip.groupId) {
        var group = myGroups.find(function(g) { return g.id === trip.groupId; });
        if (group && group.members) {
            expense.splitWith = group.members.map(function(member) {
                return { uid: member.uid, name: member.name };
            });
        }
    }
    trip.expenses.push(expense);
    currentTripId = tripId;
    saveTripsLocal();
    if (trip.groupId && currentUser && typeof db !== 'undefined') {
        expense.tripName = trip.name;
        expense.paidByUid = currentUser.uid;
        db.collection('groups').doc(trip.groupId).collection('expenses').add(expense);
    }
    document.getElementById('allExpDesc').value = '';
    document.getElementById('allExpAmount').value = '';
    closeAllExpenseForm();
    renderAllExpenses();
    toast('Expense added! 💰', 'ok');
}

function deleteExpense(tripId, expId) {
    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { return; }
    trip.expenses = trip.expenses.filter(function(e) { return e.id !== expId; });
    saveTripsLocal();
    viewTrip(tripId);
}

function renderTripExpenses(trip) {
    var categories = {};
    for (var i = 0; i < trip.expenses.length; i++) {
        var exp = trip.expenses[i];
        if (!categories[exp.category]) { categories[exp.category] = 0; }
        categories[exp.category] += exp.amount;
    }

    var summaryHtml = '';
    for (var cat in categories) {
        summaryHtml += '<div class="exp-cat-card"><span>' + cat + '</span><span>₹' + categories[cat].toLocaleString() + '</span></div>';
    }
    document.getElementById('tvExpenseSummary').innerHTML = summaryHtml;

    var listHtml = '';
    if (trip.expenses.length === 0) {
        listHtml = '<p class="placeholder">No expenses yet! ➕</p>';
    } else {
        for (var j = trip.expenses.length - 1; j >= 0; j--) {
            var e = trip.expenses[j];
            var icon = e.category.split(' ')[0];
            listHtml += '<div class="expense-item">';
            listHtml += '<div class="expense-item-left">';
            listHtml += '<span class="expense-item-cat">' + icon + '</span>';
            listHtml += '<div class="expense-item-info"><h4>' + e.desc + '</h4>';
            listHtml += '<p>' + e.category + ' · ' + e.date;
            if (e.paidByName && e.paidByName !== 'Me') { listHtml += ' · Paid by ' + e.paidByName; }
            listHtml += '</p></div></div>';
            listHtml += '<span class="expense-item-amount">₹' + e.amount.toLocaleString() + '</span>';
            listHtml += '<button class="expense-item-del" onclick="deleteExpense(\'' + trip.id + '\',\'' + e.id + '\')">✕</button>';
            listHtml += '</div>';
        }
    }
    document.getElementById('tvExpenseList').innerHTML = listHtml;

    // Render settle up section
    renderSettleUp(trip);
}

function renderSettleUp(trip) {
    var container = document.getElementById('settleSection');
    if (!trip.groupId || !trip.expenses.length) {
        container.innerHTML = '';
        return;
    }

    // Calculate who owes whom
    var balances = {};
    for (var i = 0; i < trip.expenses.length; i++) {
        var exp = trip.expenses[i];
        if (!exp.splitWith || exp.splitWith.length === 0) { continue; }

        var perPerson = exp.amount / exp.splitWith.length;
        var payerUid = exp.paidBy === 'me' ? 'me' : exp.paidBy;

        for (var j = 0; j < exp.splitWith.length; j++) {
            var member = exp.splitWith[j];
            if (member.uid === payerUid) { continue; }

            var key = member.name;
            if (!balances[key]) { balances[key] = 0; }

            if (payerUid === 'me') {
                balances[key] += perPerson; // They owe me
            } else {
                balances[key] -= perPerson; // I owe them
            }
        }
    }

    var html = '<h4 style="margin-bottom:10px;color:var(--sky1);">💳 Settle Up</h4>';
    var hasBalances = false;

    for (var name in balances) {
        var amount = Math.round(balances[name]);
        if (amount === 0) { continue; }
        hasBalances = true;

        if (amount > 0) {
            html += '<div class="settle-card owed-to-you">';
            html += '<div class="settle-info"><h4>' + name + '</h4><p>owes you</p></div>';
            html += '<span class="settle-amount green">₹' + amount.toLocaleString() + '</span>';
            html += '</div>';
        } else {
            html += '<div class="settle-card you-owe">';
            html += '<div class="settle-info"><h4>' + name + '</h4><p>you owe</p></div>';
            html += '<span class="settle-amount red">₹' + Math.abs(amount).toLocaleString() + '</span>';
            html += '</div>';
        }
    }

    if (!hasBalances) { html += '<p class="placeholder">All settled up! ✅</p>'; }
    container.innerHTML = html;
}

// ============ ALL EXPENSES ============
function renderAllExpenses() {
    var totalSpent = 0;
    var totalOwe = 0;
    var totalOwed = 0;
    var allExp = [];
    var catTotals = {};

    for (var i = 0; i < allTrips.length; i++) {
        var trip = allTrips[i];
        if (!trip.expenses) { continue; }
        for (var j = 0; j < trip.expenses.length; j++) {
            var exp = trip.expenses[j];
            totalSpent += exp.amount;
            allExp.push({ trip: trip.name, expense: exp });
            if (!catTotals[exp.category]) { catTotals[exp.category] = 0; }
            catTotals[exp.category] += exp.amount;
        }
    }

    document.getElementById('totalSpentAll').textContent = '₹' + totalSpent.toLocaleString();
    document.getElementById('totalIOwe').textContent = '₹' + totalOwe.toLocaleString();
    document.getElementById('totalOwedToMe').textContent = '₹' + totalOwed.toLocaleString();

    var maxCat = 0;
    for (var c in catTotals) { if (catTotals[c] > maxCat) { maxCat = catTotals[c]; } }

    var chartHtml = '';
    for (var ck in catTotals) {
        var pct = maxCat > 0 ? Math.round(catTotals[ck] / maxCat * 100) : 0;
        chartHtml += '<div class="cat-bar-row"><span class="cat-bar-label">' + ck + '</span>';
        chartHtml += '<div class="cat-bar-track"><div class="cat-bar-fill" style="width:' + pct + '%">₹' + catTotals[ck].toLocaleString() + '</div></div></div>';
    }
    document.getElementById('categoryChart').innerHTML = chartHtml || '<p class="placeholder">No expenses!</p>';

    var listHtml = '';
    for (var k = allExp.length - 1; k >= 0; k--) {
        var item = allExp[k];
        var catIcon = item.expense.category.split(' ')[0];
        listHtml += '<div class="expense-item"><div class="expense-item-left"><span class="expense-item-cat">' + catIcon + '</span>';
        listHtml += '<div class="expense-item-info"><h4>' + item.expense.desc + '</h4><p>' + item.trip + ' · ' + item.expense.date + '</p></div></div>';
        listHtml += '<span class="expense-item-amount">₹' + item.expense.amount.toLocaleString() + '</span></div>';
    }
    document.getElementById('allExpensesList').innerHTML = listHtml || '<p class="placeholder">No expenses!</p>';
}

// ============ GROUPS ============
function showCreateGroup() {
    document.getElementById('createGroupBox').style.display = 'block';
}

function createGroup() {
    var name = document.getElementById('groupName').value.trim();
    if (!name) { toast('Enter group name!', 'warn'); return; }
    if (!currentUser) { toast('Sign in first!', 'warn'); return; }

    var groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    var groupData = {
        name: name,
        code: groupCode,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || 'User',
        members: [{
            uid: currentUser.uid,
            name: currentUser.displayName || 'User',
            email: currentUser.email || '',
            photo: currentUser.photoURL || '',
            role: 'admin'
        }],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('groups').add(groupData).then(function(docRef) {
        document.getElementById('groupName').value = '';
        document.getElementById('createGroupBox').style.display = 'none';
        toast('Group "' + name + '" created! Code: ' + groupCode, 'ok');
        loadMyGroups();
    }).catch(function(err) {
        toast('Error: ' + err.message, 'err');
    });
}

function joinGroup() {
    var code = document.getElementById('joinCode').value.trim().toUpperCase();
    if (!code) { toast('Enter group code!', 'warn'); return; }
    if (!currentUser) { toast('Sign in first!', 'warn'); return; }

    db.collection('groups').where('code', '==', code).get().then(function(snapshot) {
        if (snapshot.empty) {
            toast('Invalid code! No group found.', 'err');
            return;
        }

        var doc = snapshot.docs[0];
        var group = doc.data();

        // Check if already member
        var alreadyMember = false;
        if (group.members) {
            for (var i = 0; i < group.members.length; i++) {
                if (group.members[i].uid === currentUser.uid) {
                    alreadyMember = true;
                    break;
                }
            }
        }

        if (alreadyMember) {
            toast('You are already in this group!', 'warn');
            return;
        }

        // Add member
        var newMember = {
            uid: currentUser.uid,
            name: currentUser.displayName || 'User',
            email: currentUser.email || '',
            photo: currentUser.photoURL || '',
            role: 'member'
        };

        db.collection('groups').doc(doc.id).update({
            members: firebase.firestore.FieldValue.arrayUnion(newMember)
        }).then(function() {
            document.getElementById('joinCode').value = '';
            toast('Joined "' + group.name + '"! 🎉', 'ok');
            loadMyGroups();
        });
    }).catch(function(err) {
        toast('Error: ' + err.message, 'err');
    });
}

function loadMyGroups() {
    if (!currentUser) { return; }

    db.collection('groups').get().then(function(snapshot) {
        myGroups = [];
        snapshot.forEach(function(doc) {
            var data = doc.data();
            data.id = doc.id;
            if (data.members) {
                for (var i = 0; i < data.members.length; i++) {
                    if (data.members[i].uid === currentUser.uid) {
                        myGroups.push(data);
                        break;
                    }
                }
            }
        });
        renderGroups();
        updateDashboard();
    });
}

function renderGroups() {
    var container = document.getElementById('groupsList');
    if (myGroups.length === 0) {
        container.innerHTML = '<p class="placeholder">No groups yet! Create or join one! 👥</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < myGroups.length; i++) {
        var g = myGroups[i];
        var memberCount = g.members ? g.members.length : 0;

        html += '<div class="group-card" onclick="viewGroup(\'' + g.id + '\')">';
        html += '<div class="group-card-top"><h3>👥 ' + g.name + '</h3>';
        html += '<p>Code: ' + g.code + ' · Created by ' + g.createdByName + '</p></div>';
        html += '<div class="group-card-bot">';
        html += '<div class="group-members-avatars">';
        var showMax = Math.min(memberCount, 4);
        for (var j = 0; j < showMax; j++) {
            if (g.members[j].photo) {
                html += '<img src="' + g.members[j].photo + '" alt="">';
            }
        }
        html += '</div>';
        html += '<span class="group-member-count">' + memberCount + ' member' + (memberCount !== 1 ? 's' : '') + '</span>';
        html += '</div></div>';
    }
    container.innerHTML = html;
}

// ============ GROUP VIEW ============
function viewGroup(groupId) {
    var group = myGroups.find(function(g) { return g.id === groupId; });
    if (!group) { toast('Group not found!', 'err'); return; }

    currentGroupId = groupId;
    navigate('groupview');

    document.getElementById('gvTitle').textContent = '👥 ' + group.name;

    // Info
    document.getElementById('gvInfo').innerHTML = '<h3>📋 Group Info</h3><p>Created by: <b>' + group.createdByName + '</b></p><p>Members: <b>' + group.members.length + '</b></p>';

    // Code
    document.getElementById('gvCode').innerHTML = '<h3>🔗 Invite Friends</h3><p class="small">Share this code with friends to join:</p><div class="group-code-box"><span class="group-code">' + group.code + '</span><button class="copy-btn" onclick="copyCode(\'' + group.code + '\')">📋 Copy</button></div>';

    // Members
    var membersHtml = '';
    for (var i = 0; i < group.members.length; i++) {
        var m = group.members[i];
        membersHtml += '<div class="member-item">';
        if (m.photo) { membersHtml += '<img src="' + m.photo + '" alt="">'; }
        membersHtml += '<div class="member-item-info"><h4>' + m.name + '</h4><p>' + (m.email || '') + '</p></div>';
        if (m.role === 'admin') { membersHtml += '<span class="member-badge">Admin</span>'; }
        membersHtml += '</div>';
    }
    document.getElementById('gvMembers').innerHTML = membersHtml;
    var isAdmin = currentUser && group.members.some(function(member) {
        return member.uid === currentUser.uid && member.role === 'admin';
    });
    document.getElementById('addMemberBox').style.display = isAdmin ? 'block' : 'none';

    // Load chat
    loadGroupChat(groupId);

    // Load group expenses
    loadGroupExpenses(groupId);
}

function addManualMember() {
    var nameInput = document.getElementById('manualMemberName');
    var emailInput = document.getElementById('manualMemberEmail');
    var name = nameInput.value.trim();
    var email = emailInput.value.trim();
    var group = myGroups.find(function(g) { return g.id === currentGroupId; });
    if (!currentUser || !group) { toast('Group not found!', 'err'); return; }
    var isAdmin = group.members.some(function(member) {
        return member.uid === currentUser.uid && member.role === 'admin';
    });
    if (!isAdmin) { toast('Only the group admin can add members.', 'warn'); return; }
    if (!name) { toast('Enter the member name!', 'warn'); return; }
    if (group.members.some(function(member) {
        return member.name.toLowerCase() === name.toLowerCase() || (email && member.email === email);
    })) {
        toast('That member is already in the group!', 'warn');
        return;
    }

    var newMember = {
        uid: 'manual_' + Date.now(),
        name: name,
        email: email,
        photo: '',
        role: 'member'
    };
    db.collection('groups').doc(currentGroupId).update({
        members: firebase.firestore.FieldValue.arrayUnion(newMember)
    }).then(function() {
        nameInput.value = '';
        emailInput.value = '';
        toast(name + ' added to the group!', 'ok');
        loadMyGroups();
        setTimeout(function() { viewGroup(currentGroupId); }, 300);
    }).catch(function(err) {
        toast('Could not add member: ' + err.message, 'err');
    });
}

function leaveGroup() {
    var group = myGroups.find(function(g) { return g.id === currentGroupId; });
    if (!currentUser || !group) { toast('Group not found!', 'err'); return; }
    var member = group.members.find(function(item) { return item.uid === currentUser.uid; });
    if (!member) { toast('You are not a member of this group.', 'warn'); return; }
    var adminCount = group.members.filter(function(item) { return item.role === 'admin'; }).length;
    if (member.role === 'admin' && adminCount === 1) {
        toast('Add another admin before leaving this group.', 'warn');
        return;
    }
    if (!confirm('Leave "' + group.name + '"?')) { return; }

    db.collection('groups').doc(currentGroupId).update({
        members: firebase.firestore.FieldValue.arrayRemove(member)
    }).then(function() {
        for (var i = 0; i < allTrips.length; i++) {
            if (allTrips[i].groupId === currentGroupId) {
                allTrips[i].groupId = null;
                allTrips[i].travelerMode = 'individual';
            }
        }
        saveTripsLocal();
        if (chatListener) { chatListener(); chatListener = null; }
        currentGroupId = null;
        toast('You left the group.', 'info');
        navigate('groups');
        loadMyGroups();
    }).catch(function(err) {
        toast('Could not leave group: ' + err.message, 'err');
    });
}

function copyCode(code) {
    navigator.clipboard.writeText(code).then(function() {
        toast('Code copied! 📋', 'ok');
    }).catch(function() {
        toast('Code: ' + code, 'info');
    });
}

// ============ GROUP CHAT ============
function loadGroupChat(groupId) {
    var chatArea = document.getElementById('groupChat');
    chatArea.innerHTML = '';

    // Unsubscribe previous listener
    if (chatListener) { chatListener(); }

    chatListener = db.collection('groups').doc(groupId).collection('messages')
        .orderBy('timestamp', 'asc')
        .limitToLast(50)
        .onSnapshot(function(snapshot) {
            chatArea.innerHTML = '';
            snapshot.forEach(function(doc) {
                var msg = doc.data();
                renderChatMessage(msg);
            });
            chatArea.scrollTop = chatArea.scrollHeight;
        });
}

function renderChatMessage(msg) {
    var chatArea = document.getElementById('groupChat');
    var isMe = currentUser && msg.uid === currentUser.uid;
    var div = document.createElement('div');
    div.className = 'chatmsg ' + (isMe ? 'me' : '');

    var avatarHtml = '<div class="chatavatar">';
    if (msg.photo) { avatarHtml += '<img src="' + msg.photo + '" alt="">'; }
    else { avatarHtml += '👤'; }
    avatarHtml += '</div>';

    var bubbleHtml = '<div class="chatbubble">';
    if (!isMe) { bubbleHtml += '<div class="chat-name">' + (msg.name || 'User') + '</div>'; }
    bubbleHtml += '<div>' + msg.text + '</div>';

    // Money request
    if (msg.moneyAmount) {
        bubbleHtml += '<div class="money-request">';
        bubbleHtml += '<div class="mr-amount">₹' + msg.moneyAmount.toLocaleString() + '</div>';
        bubbleHtml += '<div class="mr-desc">' + (msg.moneyDesc || 'Payment request') + '</div>';
        bubbleHtml += '</div>';
    }

    if (msg.time) { bubbleHtml += '<div class="chat-time">' + msg.time + '</div>'; }
    bubbleHtml += '</div>';

    div.innerHTML = avatarHtml + bubbleHtml;
    chatArea.appendChild(div);
}

function sendGroupMessage() {
    var input = document.getElementById('groupChatInput');
    var text = input.value.trim();
    if (!text || !currentUser || !currentGroupId) { return; }
    input.value = '';

    // Check if it's a money request: /pay 500 for lunch
    var moneyMatch = text.match(/^\/pay\s+(\d+)\s+(?:for\s+)?(.+)/i);

    var msgData = {
        uid: currentUser.uid,
        name: currentUser.displayName || 'User',
        photo: currentUser.photoURL || '',
        text: moneyMatch ? '💰 Requesting payment:' : text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (moneyMatch) {
        msgData.moneyAmount = parseInt(moneyMatch[1]);
        msgData.moneyDesc = moneyMatch[2];
    }

    db.collection('groups').doc(currentGroupId).collection('messages').add(msgData);
}

// ============ GROUP EXPENSES ============
function loadGroupExpenses(groupId) {
    db.collection('groups').doc(groupId).collection('expenses')
        .orderBy('date', 'desc')
        .get().then(function(snapshot) {
            var html = '';
            if (snapshot.empty) {
                html = '<p class="placeholder">No group expenses yet!</p>';
            } else {
                snapshot.forEach(function(doc) {
                    var e = doc.data();
                    var icon = e.category ? e.category.split(' ')[0] : '📦';
                    html += '<div class="expense-item">';
                    html += '<div class="expense-item-left"><span class="expense-item-cat">' + icon + '</span>';
                    html += '<div class="expense-item-info"><h4>' + (e.desc || '') + '</h4>';
                    html += '<p>Paid by ' + (e.paidByName || 'Unknown') + ' · ' + (e.date || '') + '</p></div></div>';
                    html += '<span class="expense-item-amount">₹' + (e.amount || 0).toLocaleString() + '</span>';
                    html += '</div>';
                });
            }
            document.getElementById('gvExpenses').innerHTML = html;
        });
}

// ============ MAP ============
var travelMap = null;
var mapMarkers = [];

function initMap() {
    var mapDiv = document.getElementById('travelMap');
    if (!mapDiv) { return; }
    if (travelMap) { travelMap.remove(); travelMap = null; }

    travelMap = L.map('travelMap').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(travelMap);

    for (var i = 0; i < allTrips.length; i++) {
        geocodeTrip(allTrips[i]);
    }
    renderPlacesList();
}

function geocodeTrip(trip) {
    fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(trip.destination))
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.length > 0) {
                var lat = parseFloat(data[0].lat);
                var lon = parseFloat(data[0].lon);
                var marker = L.marker([lat, lon]).addTo(travelMap);
                marker.bindPopup('<b>' + trip.name + '</b><br>📍 ' + trip.destination + '<br>' + trip.type);
                mapMarkers.push(marker);
            }
        }).catch(function() {});
}

function renderPlacesList() {
    var container = document.getElementById('placesList');
    if (allTrips.length === 0) {
        container.innerHTML = '<p class="placeholder">Add trips to see places!</p>';
        return;
    }
    var html = '';
    for (var i = 0; i < allTrips.length; i++) {
        var t = allTrips[i];
        html += '<div class="place-item"><div><h4>' + t.type.split(' ')[0] + ' ' + t.destination + '</h4><p>' + t.name + ' · ' + t.startDate + '</p></div></div>';
    }
    container.innerHTML = html;
}

// ============ CURRENCY ============
var exchangeRates = { INR:1, USD:0.0119, EUR:0.0109, GBP:0.0094, JPY:1.78, AUD:0.0183, THB:0.41, SGD:0.016, AED:0.0437, LKR:3.55 };
var currencyFlags = { INR:'🇮🇳', USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', JPY:'🇯🇵', AUD:'🇦🇺', THB:'🇹🇭', SGD:'🇸🇬', AED:'🇦🇪', LKR:'🇱🇰' };
var currencyNames = { INR:'Indian Rupee', USD:'US Dollar', EUR:'Euro', GBP:'British Pound', JPY:'Japanese Yen', AUD:'Australian Dollar', THB:'Thai Baht', SGD:'Singapore Dollar', AED:'UAE Dirham', LKR:'Sri Lankan Rupee' };

function convertCurrency() {
    var amount = parseFloat(document.getElementById('currAmount').value) || 0;
    var from = document.getElementById('currFrom').value;
    var to = document.getElementById('currTo').value;
    var inINR = amount / exchangeRates[from];
    var result = inINR * exchangeRates[to];
    document.getElementById('convertFrom').textContent = amount.toLocaleString() + ' ' + from;
    document.getElementById('convertTo').textContent = '= ' + result.toFixed(2) + ' ' + to;
}

function swapCurrency() {
    var f = document.getElementById('currFrom');
    var t = document.getElementById('currTo');
    var temp = f.value;
    f.value = t.value;
    t.value = temp;
    convertCurrency();
}

function renderCurrencyTable() {
    var html = '';
    for (var code in exchangeRates) {
        if (code === 'INR') { continue; }
        var oneUnit = (1 / exchangeRates[code]).toFixed(2);
        html += '<div class="curr-row"><span><span class="curr-flag">' + (currencyFlags[code] || '') + '</span> ' + code + ' — ' + currencyNames[code] + '</span><span class="curr-rate">1 ' + code + ' = ₹' + oneUnit + '</span></div>';
    }
    document.getElementById('currencyTable').innerHTML = html;
}

function fetchLiveRates() {
    fetch('https://api.exchangerate-api.com/v4/latest/INR')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data && data.rates) {
                for (var code in exchangeRates) {
                    if (data.rates[code]) { exchangeRates[code] = data.rates[code]; }
                }
            }
        }).catch(function() {});
}

// ============ BUCKET LIST ============
function addBucketItem() { document.getElementById('bucketForm').style.display = 'block'; }
function closeBucketForm() { document.getElementById('bucketForm').style.display = 'none'; }

function saveBucketItem() {
    var place = document.getElementById('bucketPlace').value.trim();
    var reason = document.getElementById('bucketReason').value.trim();
    if (!place) { toast('Enter a place!', 'warn'); return; }
    bucketList.push({ id: 'bk_' + Date.now(), place: place, reason: reason, done: false });
    localStorage.setItem('tlBucket', JSON.stringify(bucketList));
    document.getElementById('bucketPlace').value = '';
    document.getElementById('bucketReason').value = '';
    closeBucketForm();
    renderBucket();
    toast('Added! 🎯', 'ok');
}

function toggleBucket(id) {
    for (var i = 0; i < bucketList.length; i++) {
        if (bucketList[i].id === id) { bucketList[i].done = !bucketList[i].done; break; }
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
        container.innerHTML = '<p class="placeholder">Empty bucket list! 🌍</p>';
        return;
    }
    var html = '';
    for (var i = 0; i < bucketList.length; i++) {
        var b = bucketList[i];
        html += '<div class="bucket-item ' + (b.done ? 'done' : '') + '">';
        html += '<input type="checkbox" class="bucket-check" ' + (b.done ? 'checked' : '') + ' onchange="toggleBucket(\'' + b.id + '\')">';
        html += '<div class="bucket-text"><h4>' + (b.done ? '✅ ' : '🎯 ') + b.place + '</h4>';
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

    // Theme
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

    // Firebase Auth listener
    auth.onAuthStateChanged(function(user) {
        if (user) {
            onUserLoggedIn(user);
        }
    });

    // Load data
    updateDashboard();
    renderRecentTrips();
    fetchLiveRates();

    toast('TravelLog ready! 🌊', 'ok');
};