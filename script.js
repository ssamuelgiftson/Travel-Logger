// =============================================
//  TRAVELLOG — Cloud Sync + All Features
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
var advancePayments = JSON.parse(localStorage.getItem('tlAdvances') || '[]');
var collections = JSON.parse(localStorage.getItem('tlCollections') || '[]');
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

    if (pageId === 'home') { updateDashboard(); renderRecentTrips(); }
    if (pageId === 'trips') { renderTrips(); }
    if (pageId === 'expenses') { renderAllExpenses(); populateGlobalExpenseForm(); }
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

    if (hour >= 5 && hour < 12) { body.classList.add('theme-morning'); }
    else if (hour >= 12 && hour < 17) { body.classList.add('theme-afternoon'); }
    else if (hour >= 17 && hour < 21) { body.classList.add('theme-evening'); }
    else { body.classList.add('theme-night'); }
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

    var userArea = document.getElementById('userArea');
    if (userArea) { userArea.style.display = 'flex'; }
    var pic = document.getElementById('userPic');
    if (pic && user.photoURL) { pic.src = user.photoURL; }
    var nameEl = document.getElementById('userName');
    if (nameEl) { nameEl.textContent = user.displayName ? user.displayName.split(' ')[0] : 'User'; }

    // Save user to Firestore
    db.collection('users').doc(user.uid).set({
        name: user.displayName || 'User',
        email: user.email || '',
        photo: user.photoURL || '',
        uid: user.uid
    }, { merge: true });

    updateGreeting();
    loadMyGroups();
    loadCloudData(user.uid);
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

// ============ CLOUD SYNC ============
function saveTripsLocal() {
    localStorage.setItem('tlTrips', JSON.stringify(allTrips));
    saveToCloud();
}

function saveToCloud() {
    if (!currentUser || typeof db === 'undefined') { return; }
    db.collection('users').doc(currentUser.uid).set({
        trips: JSON.stringify(allTrips),
        bucketList: JSON.stringify(bucketList),
        advances: JSON.stringify(advancePayments),
                collections: JSON.stringify(collections),
        updatedAt: new Date().toISOString()
    }, { merge: true }).catch(function(err) {
        console.log('Cloud save error:', err);
    });
}

function loadCloudData(userId) {
    db.collection('users').doc(userId).get().then(function(doc) {
        if (!doc.exists) { return; }
        var data = doc.data();

        // Load trips
        if (data.trips) {
            try {
                var cloudTrips = JSON.parse(data.trips);
                if (cloudTrips.length > allTrips.length) {
                    allTrips = cloudTrips;
                    localStorage.setItem('tlTrips', JSON.stringify(allTrips));
                    toast('📥 Trips restored from cloud!', 'ok');
                }
            } catch (e) { console.log('Parse error:', e); }
        }

        // Load bucket list
        if (data.bucketList) {
            try {
                var cloudBucket = JSON.parse(data.bucketList);
                if (cloudBucket.length > bucketList.length) {
                    bucketList = cloudBucket;
                    localStorage.setItem('tlBucket', JSON.stringify(bucketList));
                }
            } catch (e) {}
        }
        if (data.collections) {
            try {
                var cloudCol = JSON.parse(data.collections);
                if (cloudCol.length > collections.length) {
                    collections = cloudCol;
                    localStorage.setItem('tlCollections', JSON.stringify(collections));
                }
            } catch (e) {}
        }
        // Load advances
        if (data.advances) {
            try {
                var cloudAdv = JSON.parse(data.advances);
                if (cloudAdv.length > advancePayments.length) {
                    advancePayments = cloudAdv;
                    localStorage.setItem('tlAdvances', JSON.stringify(advancePayments));
                }
            } catch (e) {}
        }

        updateDashboard();
        renderRecentTrips();
    }).catch(function(err) {
        console.log('Cloud load error:', err);
    });
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
        container.innerHTML = '<p class="placeholder">No trips yet! ✈️</p>';
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
        html += '<p>📍 ' + t.destination + ' · ' + t.type + '</p></div>';
        html += '<div class="trip-card-bot"><div class="trip-card-meta"><span>📅 ' + t.startDate + '</span><span>💰 ₹' + spent.toLocaleString() + '</span></div></div></div>';
    }
    container.innerHTML = html;
}

// ============ TRAVELER MODE ============
function setTravelerMode(mode) {
    var options = document.querySelectorAll('.traveler-option');
    for (var i = 0; i < options.length; i++) { options[i].classList.remove('selected'); }

    var groupFields = document.getElementById('groupFields');
    var soloHint = document.getElementById('soloHint');

    if (mode === 'solo') {
        if (options[0]) { options[0].classList.add('selected'); }
        if (groupFields) { groupFields.classList.add('hidden-field'); }
        if (soloHint) { soloHint.style.display = 'block'; }
    } else {
        if (options[1]) { options[1].classList.add('selected'); }
        if (groupFields) { groupFields.classList.remove('hidden-field'); }
        if (soloHint) { soloHint.style.display = 'none'; }
    }

    var radios = document.querySelectorAll('input[name="travelerMode"]');
    for (var j = 0; j < radios.length; j++) {
        radios[j].checked = radios[j].value === mode;
    }
}

// ============ TRIPS ============
function saveTrip() {
    var name = document.getElementById('tripName').value.trim();
    var dest = document.getElementById('tripDest').value.trim();
    var start = document.getElementById('tripStart').value;
    var end = document.getElementById('tripEnd').value;
    var type = document.getElementById('tripType').value;
    var notes = document.getElementById('tripNotes').value.trim();

    // Get traveler mode
    var modeRadio = document.querySelector('input[name="travelerMode"]:checked');
    var travelMode = modeRadio ? modeRadio.value : 'solo';
    var groupId = null;

    if (travelMode === 'group') {
        var groupSel = document.getElementById('tripGroup');
        if (groupSel) { groupId = groupSel.value || null; }
    }

    if (!name) { toast('Enter trip name!', 'warn'); return; }
    if (!dest) { toast('Enter destination!', 'warn'); return; }
    if (!start || !end) { toast('Pick dates!', 'warn'); return; }

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
        travelMode: travelMode,
        groupId: groupId,
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
    var list = filter && filter !== 'all' ? allTrips.filter(function(t) { return getTripStatus(t) === filter; }) : allTrips;
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
    h += '<p style="color:var(--txt2);margin-bottom:12px;">📍 ' + trip.destination + ' · ' + getTripStatusLabel(status);
    if (trip.travelMode === 'group') { h += ' · 👥 Group trip'; }
    h += '</p>';
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

// ============ TRIP EXPENSES ============
function openExpenseForm() {
    document.getElementById('expenseForm').style.display = 'block';
    populateExpensePaidBy();
}

function closeExpenseForm() {
    document.getElementById('expenseForm').style.display = 'none';
}

function populateExpensePaidBy() {
    var sel = document.getElementById('expPaidBy');
    if (!sel) { return; }
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

function addExpense() {
    var desc = document.getElementById('expDesc').value.trim();
    var amount = parseFloat(document.getElementById('expAmount').value);
    var category = document.getElementById('expCategory').value;
    var subCategory = '';
    var expDate = '';
    var paidBy = 'me';
    var accountPayer = 'Me';
    var travelerToPay = '';

    var subCatEl = document.getElementById('expSubCategory');
    if (subCatEl) { subCategory = subCatEl.value.trim(); }

    var dateEl = document.getElementById('expDate');
    if (dateEl) { expDate = dateEl.value; }

    var paidByEl = document.getElementById('expPaidBy');
    if (paidByEl) { paidBy = paidByEl.value; }

    var accPayerEl = document.getElementById('expAccountPayer');
    if (accPayerEl) { accountPayer = accPayerEl.value; }

    var travelerEl = document.getElementById('expTraveler');
    if (travelerEl) { travelerToPay = travelerEl.value.trim(); }

    if (!desc) { toast('Enter description!', 'warn'); return; }
    if (!amount || amount <= 0) { toast('Enter valid amount!', 'warn'); return; }

    var trip = allTrips.find(function(t) { return t.id === currentTripId; });
    if (!trip) { toast('Trip not found!', 'err'); return; }

    var paidByName = 'Me';
    if (paidBy !== 'me' && paidByEl) {
        paidByName = paidByEl.options[paidByEl.selectedIndex].textContent;
    }

    trip.expenses.push({
        id: 'exp_' + Date.now(),
        desc: desc,
        amount: amount,
        category: category,
        subCategory: subCategory,
        paidBy: paidBy,
        paidByName: paidByName,
        accountPayer: accountPayer,
        travelerToPay: travelerToPay,
        date: expDate || new Date().toLocaleDateString()
    });

    saveTripsLocal();
    closeExpenseForm();

    // Clear form
    document.getElementById('expDesc').value = '';
    document.getElementById('expAmount').value = '';
    if (subCatEl) { subCatEl.value = ''; }
    if (travelerEl) { travelerEl.value = ''; }

    // Sync to Firebase group if group trip
    if (trip.groupId && currentUser) {
        var expData = trip.expenses[trip.expenses.length - 1];
        expData.tripName = trip.name;
        db.collection('groups').doc(trip.groupId).collection('expenses').add(expData).catch(function(err) {
            console.log('Group expense sync error:', err);
        });
    }

    viewTrip(currentTripId);
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
            listHtml += '<p>' + e.category;
            if (e.subCategory) { listHtml += ' → ' + e.subCategory; }
            listHtml += ' · ' + e.date;
            if (e.paidByName && e.paidByName !== 'Me') { listHtml += ' · Paid by ' + e.paidByName; }
            if (e.travelerToPay) { listHtml += ' · For: ' + e.travelerToPay; }
            listHtml += '</p></div></div>';
            listHtml += '<span class="expense-item-amount">₹' + e.amount.toLocaleString() + '</span>';
            listHtml += '<button class="expense-item-del" onclick="deleteExpense(\'' + trip.id + '\',\'' + e.id + '\')">✕</button>';
            listHtml += '</div>';
        }
    }
    document.getElementById('tvExpenseList').innerHTML = listHtml;

    renderSettleUp(trip);
}

function renderSettleUp(trip) {
    var container = document.getElementById('settleSection');
    if (!container) { return; }
    if (!trip.groupId || !trip.expenses || !trip.expenses.length) {
        container.innerHTML = '';
        return;
    }

    var balances = {};
    for (var i = 0; i < trip.expenses.length; i++) {
        var exp = trip.expenses[i];
        if (exp.travelerToPay && exp.paidByName) {
            var key = exp.travelerToPay;
            if (!balances[key]) { balances[key] = 0; }
            if (exp.paidBy === 'me') {
                balances[key] += exp.amount;
            } else {
                balances[key] -= exp.amount;
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
            html += '<div class="settle-card owed-to-you"><div class="settle-info"><h4>' + name + '</h4><p>owes you</p></div><span class="settle-amount green">₹' + amount.toLocaleString() + '</span></div>';
        } else {
            html += '<div class="settle-card you-owe"><div class="settle-info"><h4>' + name + '</h4><p>you owe</p></div><span class="settle-amount red">₹' + Math.abs(amount).toLocaleString() + '</span></div>';
        }
    }

    if (!hasBalances) { html += '<p class="placeholder">All settled! ✅</p>'; }
    container.innerHTML = html;
}

// ============ GLOBAL EXPENSES ============
function populateGlobalExpenseForm() {
    var tripSel = document.getElementById('globalExpTrip');
    if (!tripSel) { return; }
    tripSel.innerHTML = '<option value="">-- Select Trip --</option>';
    for (var i = 0; i < allTrips.length; i++) {
        var opt = document.createElement('option');
        opt.value = allTrips[i].id;
        opt.textContent = allTrips[i].name;
        tripSel.appendChild(opt);
    }

    // Also populate advance trip selector
    var advTripSel = document.getElementById('advTrip');
    if (advTripSel) {
        advTripSel.innerHTML = '<option value="">-- Select Trip --</option>';
        for (var j = 0; j < allTrips.length; j++) {
            var opt2 = document.createElement('option');
            opt2.value = allTrips[j].id;
            opt2.textContent = allTrips[j].name;
            advTripSel.appendChild(opt2);
        }
    }
}

function showGlobalExpenseForm() {
    var form = document.getElementById('globalExpenseForm');
    if (form) { form.style.display = 'block'; }
    populateGlobalExpenseForm();
}

function hideGlobalExpenseForm() {
    var form = document.getElementById('globalExpenseForm');
    if (form) { form.style.display = 'none'; }
}

function addGlobalExpense() {
    var tripId = document.getElementById('globalExpTrip').value;
    if (!tripId) { toast('Select a trip!', 'warn'); return; }

    var desc = document.getElementById('globalExpDesc').value.trim();
    var amount = parseFloat(document.getElementById('globalExpAmount').value);
    var category = document.getElementById('globalExpCategory').value;
    var date = document.getElementById('globalExpDate').value;
    var subCategory = '';
    var paidBy = '';
    var traveler = '';

    var subCatEl = document.getElementById('globalExpSubCategory');
    if (subCatEl) { subCategory = subCatEl.value.trim(); }

    var paidByEl = document.getElementById('globalExpPaidBy');
    if (paidByEl) { paidBy = paidByEl.value.trim(); }

    var travelerEl = document.getElementById('globalExpTraveler');
    if (travelerEl) { traveler = travelerEl.value.trim(); }

    if (!desc) { toast('Enter description!', 'warn'); return; }
    if (!amount || amount <= 0) { toast('Enter valid amount!', 'warn'); return; }

    var trip = allTrips.find(function(t) { return t.id === tripId; });
    if (!trip) { toast('Trip not found!', 'err'); return; }

    trip.expenses.push({
        id: 'exp_' + Date.now(),
        desc: desc,
        amount: amount,
        category: category,
        subCategory: subCategory,
        paidBy: paidBy || 'me',
        paidByName: paidBy || 'Me',
        travelerToPay: traveler,
        date: date || new Date().toLocaleDateString()
    });

    saveTripsLocal();
    hideGlobalExpenseForm();

    // Clear form
    document.getElementById('globalExpDesc').value = '';
    document.getElementById('globalExpAmount').value = '';
    if (subCatEl) { subCatEl.value = ''; }
    if (travelerEl) { travelerEl.value = ''; }

    renderAllExpenses();
    toast('Expense added! 💰', 'ok');
}

// ============ ADVANCE PAYMENTS ============
function showAdvanceForm() {
    var form = document.getElementById('advanceForm');
    if (form) { form.style.display = 'block'; }
    populateGlobalExpenseForm();
}

function hideAdvanceForm() {
    var form = document.getElementById('advanceForm');
    if (form) { form.style.display = 'none'; }
}

function saveAdvance() {
    var tripId = document.getElementById('advTrip').value;
    var date = document.getElementById('advDate').value;
    var amount = parseFloat(document.getElementById('advAmount').value);
    var traveler = document.getElementById('advTraveler').value.trim();
    var note = document.getElementById('advNote').value.trim();

    if (!tripId) { toast('Select a trip!', 'warn'); return; }
    if (!amount || amount <= 0) { toast('Enter valid amount!', 'warn'); return; }
    if (!traveler) { toast('Enter traveler name!', 'warn'); return; }

    advancePayments.push({
        id: 'adv_' + Date.now(),
        tripId: tripId,
        date: date || new Date().toLocaleDateString(),
        amount: amount,
        traveler: traveler,
        note: note
    });

    localStorage.setItem('tlAdvances', JSON.stringify(advancePayments));
    saveToCloud();
    hideAdvanceForm();

    document.getElementById('advAmount').value = '';
    document.getElementById('advTraveler').value = '';
    document.getElementById('advNote').value = '';

    renderAllExpenses();
    toast('Advance recorded! 💵', 'ok');
}

// ============ DAILY CASH REPORT ============
function showDailyCashReport() {
    var today = new Date().toLocaleDateString();
    var todayExpenses = [];
    var totalToday = 0;

    for (var i = 0; i < allTrips.length; i++) {
        if (!allTrips[i].expenses) { continue; }
        for (var j = 0; j < allTrips[i].expenses.length; j++) {
            var exp = allTrips[i].expenses[j];
            if (exp.date === today) {
                todayExpenses.push({ trip: allTrips[i].name, expense: exp });
                totalToday += exp.amount;
            }
        }
    }

    var html = '<div class="infobox"><h3>🧾 Daily Cash Report — ' + today + '</h3>';
    html += '<p style="font-size:1.2rem;font-weight:800;color:var(--coral);margin-bottom:12px;">Total Today: ₹' + totalToday.toLocaleString() + '</p>';

    if (todayExpenses.length === 0) {
        html += '<p class="placeholder">No expenses today!</p>';
    } else {
        for (var k = 0; k < todayExpenses.length; k++) {
            var item = todayExpenses[k];
            var icon = item.expense.category.split(' ')[0];
            html += '<div class="expense-item">';
            html += '<div class="expense-item-left"><span class="expense-item-cat">' + icon + '</span>';
            html += '<div class="expense-item-info"><h4>' + item.expense.desc + '</h4>';
            html += '<p>' + item.trip + ' · ' + item.expense.category + '</p></div></div>';
            html += '<span class="expense-item-amount">₹' + item.expense.amount.toLocaleString() + '</span></div>';
        }
    }
    html += '</div>';

    // Show in a simple alert-like way or insert into page
    var existingReport = document.getElementById('dailyReport');
    if (existingReport) {
        existingReport.innerHTML = html;
        existingReport.style.display = 'block';
    } else {
        toast('Today: ₹' + totalToday.toLocaleString() + ' across ' + todayExpenses.length + ' expenses', 'info');
    }
}

// ============ ALL EXPENSES ============
function renderAllExpenses() {
    var totalSpent = 0;
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
    var ioweEl = document.getElementById('totalIOwe');
    var owedEl = document.getElementById('totalOwedToMe');
    if (ioweEl) { ioweEl.textContent = '₹0'; }
    if (owedEl) { owedEl.textContent = '₹0'; }

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
        listHtml += '<div class="expense-item-info"><h4>' + item.expense.desc + '</h4>';
        listHtml += '<p>' + item.trip + ' · ' + item.expense.date;
        if (item.expense.travelerToPay) { listHtml += ' · For: ' + item.expense.travelerToPay; }
        listHtml += '</p></div></div>';
        listHtml += '<span class="expense-item-amount">₹' + item.expense.amount.toLocaleString() + '</span></div>';
    }
    document.getElementById('allExpensesList').innerHTML = listHtml || '<p class="placeholder">No expenses!</p>';
        renderCollections();
    renderReconciliation();
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

    db.collection('groups').add(groupData).then(function() {
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
    if (!code) { toast('Enter code!', 'warn'); return; }
    if (!currentUser) { toast('Sign in first!', 'warn'); return; }

    db.collection('groups').where('code', '==', code).get().then(function(snapshot) {
        if (snapshot.empty) { toast('Invalid code!', 'err'); return; }
        var doc = snapshot.docs[0];
        var group = doc.data();

        for (var i = 0; i < group.members.length; i++) {
            if (group.members[i].uid === currentUser.uid) {
                toast('Already in this group!', 'warn');
                return;
            }
        }

        db.collection('groups').doc(doc.id).update({
            members: firebase.firestore.FieldValue.arrayUnion({
                uid: currentUser.uid,
                name: currentUser.displayName || 'User',
                email: currentUser.email || '',
                photo: currentUser.photoURL || '',
                role: 'member'
            })
        }).then(function() {
            document.getElementById('joinCode').value = '';
            toast('Joined "' + group.name + '"! 🎉', 'ok');
            loadMyGroups();
        });
    }).catch(function(err) { toast('Error: ' + err.message, 'err'); });
}

function addManualMember() {
    var nameInput = document.getElementById('manualMemberName');
    if (!nameInput) { return; }
    var name = nameInput.value.trim();
    if (!name) { toast('Enter member name!', 'warn'); return; }
    if (!currentGroupId) { return; }

    var manualMember = {
        uid: 'manual_' + Date.now(),
        name: name,
        email: '',
        photo: '',
        role: 'member'
    };

    db.collection('groups').doc(currentGroupId).update({
        members: firebase.firestore.FieldValue.arrayUnion(manualMember)
    }).then(function() {
        nameInput.value = '';
        toast(name + ' added! 👥', 'ok');
        loadMyGroups();
        setTimeout(function() { viewGroup(currentGroupId); }, 500);
    }).catch(function(err) { toast('Error: ' + err.message, 'err'); });
}

function leaveGroup() {
    if (!currentGroupId || !currentUser) { return; }
    if (!confirm('Leave this group?')) { return; }

    var group = myGroups.find(function(g) { return g.id === currentGroupId; });
    if (!group) { return; }

    var updatedMembers = group.members.filter(function(m) { return m.uid !== currentUser.uid; });

    db.collection('groups').doc(currentGroupId).update({
        members: updatedMembers
    }).then(function() {
        toast('Left the group!', 'info');
        navigate('groups');
        loadMyGroups();
    }).catch(function(err) { toast('Error: ' + err.message, 'err'); });
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
        container.innerHTML = '<p class="placeholder">No groups! 👥</p>';
        return;
    }
    var html = '';
    for (var i = 0; i < myGroups.length; i++) {
        var g = myGroups[i];
        var mc = g.members ? g.members.length : 0;
        html += '<div class="group-card" onclick="viewGroup(\'' + g.id + '\')">';
        html += '<div class="group-card-top"><h3>👥 ' + g.name + '</h3>';
        html += '<p>Code: ' + g.code + '</p></div>';
        html += '<div class="group-card-bot">';
        html += '<div class="group-members-avatars">';
        for (var j = 0; j < Math.min(mc, 4); j++) {
            if (g.members[j].photo) { html += '<img src="' + g.members[j].photo + '" alt="">'; }
        }
        html += '</div>';
        html += '<span class="group-member-count">' + mc + ' member' + (mc !== 1 ? 's' : '') + '</span>';
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function viewGroup(groupId) {
    var group = myGroups.find(function(g) { return g.id === groupId; });
    if (!group) { toast('Not found!', 'err'); return; }
    currentGroupId = groupId;
    navigate('groupview');

    document.getElementById('gvTitle').textContent = '👥 ' + group.name;
    document.getElementById('gvInfo').innerHTML = '<h3>📋 Info</h3><p>Created by: <b>' + group.createdByName + '</b></p><p>Members: <b>' + group.members.length + '</b></p>';
    document.getElementById('gvCode').innerHTML = '<h3>🔗 Invite</h3><p class="small">Share code:</p><div class="group-code-box"><span class="group-code">' + group.code + '</span><button class="copy-btn" onclick="copyCode(\'' + group.code + '\')">📋 Copy</button></div>';

    var membersHtml = '';
    for (var i = 0; i < group.members.length; i++) {
        var m = group.members[i];
        membersHtml += '<div class="member-item">';
        if (m.photo) { membersHtml += '<img src="' + m.photo + '" alt="">'; }
        membersHtml += '<div class="member-item-info"><h4>' + m.name + '</h4><p>' + (m.email || 'Manual member') + '</p></div>';
        if (m.role === 'admin') { membersHtml += '<span class="member-badge">Admin</span>'; }
        membersHtml += '</div>';
    }
    document.getElementById('gvMembers').innerHTML = membersHtml;

    loadGroupChat(groupId);
    loadGroupExpenses(groupId);
}

function copyCode(code) {
    navigator.clipboard.writeText(code).then(function() {
        toast('Copied! 📋', 'ok');
    }).catch(function() { toast('Code: ' + code, 'info'); });
}

// ============ GROUP CHAT ============
function loadGroupChat(groupId) {
    var chatArea = document.getElementById('groupChat');
    chatArea.innerHTML = '';
    if (chatListener) { chatListener(); }

    chatListener = db.collection('groups').doc(groupId).collection('messages')
        .orderBy('timestamp', 'asc')
        .limitToLast(50)
        .onSnapshot(function(snapshot) {
            chatArea.innerHTML = '';
            snapshot.forEach(function(doc) { renderChatMessage(doc.data()); });
            chatArea.scrollTop = chatArea.scrollHeight;
        });
}

function renderChatMessage(msg) {
    var chatArea = document.getElementById('groupChat');
    var isMe = currentUser && msg.uid === currentUser.uid;
    var div = document.createElement('div');
    div.className = 'chatmsg ' + (isMe ? 'me' : '');

    var avatarHtml = '<div class="chatavatar">';
    if (msg.photo) { avatarHtml += '<img src="' + msg.photo + '">'; }
    else { avatarHtml += '👤'; }
    avatarHtml += '</div>';

    var bubbleHtml = '<div class="chatbubble">';
    if (!isMe) { bubbleHtml += '<div class="chat-name">' + (msg.name || 'User') + '</div>'; }
    bubbleHtml += '<div>' + msg.text + '</div>';
    if (msg.moneyAmount) {
        bubbleHtml += '<div class="money-request"><div class="mr-amount">₹' + msg.moneyAmount.toLocaleString() + '</div>';
        bubbleHtml += '<div class="mr-desc">' + (msg.moneyDesc || 'Payment') + '</div></div>';
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

    var moneyMatch = text.match(/^\/pay\s+(\d+)\s+(?:for\s+)?(.+)/i);

    var msgData = {
        uid: currentUser.uid,
        name: currentUser.displayName || 'User',
        photo: currentUser.photoURL || '',
        text: moneyMatch ? '💰 Payment request:' : text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (moneyMatch) {
        msgData.moneyAmount = parseInt(moneyMatch[1]);
        msgData.moneyDesc = moneyMatch[2];
    }

    db.collection('groups').doc(currentGroupId).collection('messages').add(msgData);
}

function loadGroupExpenses(groupId) {
    db.collection('groups').doc(groupId).collection('expenses')
        .get().then(function(snapshot) {
            var html = '';
            if (snapshot.empty) { html = '<p class="placeholder">No group expenses!</p>'; }
            else {
                snapshot.forEach(function(doc) {
                    var e = doc.data();
                    var icon = e.category ? e.category.split(' ')[0] : '📦';
                    html += '<div class="expense-item"><div class="expense-item-left"><span class="expense-item-cat">' + icon + '</span>';
                    html += '<div class="expense-item-info"><h4>' + (e.desc || '') + '</h4>';
                    html += '<p>Paid by ' + (e.paidByName || 'Unknown') + ' · ' + (e.date || '') + '</p></div></div>';
                    html += '<span class="expense-item-amount">₹' + (e.amount || 0).toLocaleString() + '</span></div>';
                });
            }
            document.getElementById('gvExpenses').innerHTML = html;
        });
}
// ============ COLLECTIONS ============
function showCollectionForm() {
    var form = document.getElementById('collectionForm');
    if (form) {
        form.style.display = 'block';
        document.getElementById('colDate').value = new Date().toISOString().slice(0, 10);
        var sel = document.getElementById('colTrip');
        if (sel) {
            sel.innerHTML = '<option value="">-- Select Trip --</option>';
            for (var i = 0; i < allTrips.length; i++) {
                var opt = document.createElement('option');
                opt.value = allTrips[i].id;
                opt.textContent = allTrips[i].name;
                sel.appendChild(opt);
            }
        }
    }
}

function hideCollectionForm() {
    var form = document.getElementById('collectionForm');
    if (form) { form.style.display = 'none'; }
}

function saveCollection() {
    var from = document.getElementById('colFrom').value.trim();
    var amount = parseFloat(document.getElementById('colAmount').value);
    var purpose = document.getElementById('colPurpose').value.trim();
    var date = document.getElementById('colDate').value;
    var tripId = document.getElementById('colTrip').value;
    var category = document.getElementById('colCategory').value;
    var note = document.getElementById('colNote').value.trim();

    if (!from) { toast('Enter who paid!', 'warn'); return; }
    if (!amount || amount <= 0) { toast('Enter valid amount!', 'warn'); return; }
    if (!purpose) { toast('Enter what for!', 'warn'); return; }

    collections.push({
        id: 'col_' + Date.now(),
        from: from,
        amount: amount,
        purpose: purpose,
        date: date || new Date().toLocaleDateString(),
        tripId: tripId || null,
        category: category || '',
        note: note
    });

    localStorage.setItem('tlCollections', JSON.stringify(collections));
    saveToCloud();

    document.getElementById('colFrom').value = '';
    document.getElementById('colAmount').value = '';
    document.getElementById('colPurpose').value = '';
    document.getElementById('colNote').value = '';
    hideCollectionForm();

    renderCollections();
    renderReconciliation();
    toast('₹' + amount.toLocaleString() + ' collected from ' + from + '! 💵', 'ok');
}

function deleteCollection(colId) {
    if (!confirm('Delete this collection?')) { return; }
    collections = collections.filter(function(c) { return c.id !== colId; });
    localStorage.setItem('tlCollections', JSON.stringify(collections));
    saveToCloud();
    renderCollections();
    renderReconciliation();
}

function renderCollections() {
    var container = document.getElementById('collectionsList');
    if (!container) { return; }
    if (collections.length === 0) {
        container.innerHTML = '<p class="placeholder">No collections yet. Click ➕ to record!</p>';
        return;
    }
    var html = '';
    for (var i = collections.length - 1; i >= 0; i--) {
        var c = collections[i];
        var tripName = '';
        if (c.tripId) {
            var trip = allTrips.find(function(t) { return t.id === c.tripId; });
            if (trip) { tripName = trip.name; }
        }
        html += '<div class="collection-item">';
        html += '<div class="collection-header">';
        html += '<h4>💵 ' + c.from + ' → ' + c.purpose + '</h4>';
        html += '<div><span class="collection-amount">₹' + c.amount.toLocaleString() + '</span>';
        html += '<button class="collection-del" onclick="deleteCollection(\'' + c.id + '\')">✕</button></div></div>';
        html += '<div class="collection-details">📅 ' + c.date;
        if (tripName) { html += ' · ✈️ ' + tripName; }
        if (c.category) { html += ' · ' + c.category; }
        if (c.note) { html += ' · 📝 ' + c.note; }
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function renderReconciliation() {
    var container = document.getElementById('reconciliationSummary');
    if (!container) { return; }
    if (collections.length === 0) { container.innerHTML = ''; return; }

    var collectedByPerson = {};
    for (var i = 0; i < collections.length; i++) {
        var c = collections[i];
        var key = c.from.toLowerCase();
        if (!collectedByPerson[key]) { collectedByPerson[key] = { name: c.from, total: 0, items: [] }; }
        collectedByPerson[key].total += c.amount;
        collectedByPerson[key].items.push(c);
    }

    var expensesByPerson = {};
    for (var t = 0; t < allTrips.length; t++) {
        var trip = allTrips[t];
        if (!trip.expenses) { continue; }
        for (var e = 0; e < trip.expenses.length; e++) {
            var exp = trip.expenses[e];
            if (exp.splitWith) {
                var perPerson = exp.amount / exp.splitWith.length;
                for (var s = 0; s < exp.splitWith.length; s++) {
                    var mKey = exp.splitWith[s].name.toLowerCase();
                    if (!expensesByPerson[mKey]) { expensesByPerson[mKey] = { name: exp.splitWith[s].name, total: 0, items: [] }; }
                    expensesByPerson[mKey].total += perPerson;
                    expensesByPerson[mKey].items.push({ desc: exp.desc, category: exp.category, amount: perPerson });
                }
            }
        }
    }

    var allPeople = {};
    for (var ck in collectedByPerson) { allPeople[ck] = true; }
    for (var ek in expensesByPerson) { allPeople[ek] = true; }

    var html = '<h4 style="margin-bottom:12px;color:var(--sky1);">📊 Reconciliation</h4>';
    var hasData = false;

    for (var person in allPeople) {
        var collected = collectedByPerson[person] ? collectedByPerson[person].total : 0;
        var expenses = expensesByPerson[person] ? expensesByPerson[person].total : 0;
        var diff = collected - expenses;
        var personName = (collectedByPerson[person] ? collectedByPerson[person].name : '') || (expensesByPerson[person] ? expensesByPerson[person].name : person);

        if (collected === 0 && expenses === 0) { continue; }
        hasData = true;

        var status = '';
        var statusClass = '';
        var diffText = '';

        if (Math.abs(diff) < 1) {
            status = '✅ Exact'; statusClass = 'exact';
            diffText = '✅ All settled!';
        } else if (diff < 0) {
            status = '🔴 Short'; statusClass = 'short';
            diffText = '🔴 ' + personName + ' needs to pay ₹' + Math.abs(Math.round(diff)).toLocaleString() + ' more';
        } else {
            status = '🟡 Excess'; statusClass = 'excess';
            diffText = '🟡 Refund ₹' + Math.round(diff).toLocaleString() + ' to ' + personName;
        }

        html += '<div class="recon-card ' + statusClass + '">';
        html += '<div class="recon-header"><h4>👤 ' + personName + '</h4><span class="recon-status ' + statusClass + '">' + status + '</span></div>';
        html += '<div class="recon-row"><span>💵 Collected:</span><span>₹' + Math.round(collected).toLocaleString() + '</span></div>';
        html += '<div class="recon-row"><span>💰 Expenses:</span><span>₹' + Math.round(expenses).toLocaleString() + '</span></div>';
        html += '<div class="recon-diff ' + statusClass + '">' + diffText + '</div>';

        if (collectedByPerson[person] && collectedByPerson[person].items.length > 0) {
            html += '<div style="margin-top:6px;font-size:0.72rem;color:var(--txt2);"><b>Collections:</b>';
            for (var ci = 0; ci < collectedByPerson[person].items.length; ci++) {
                var cItem = collectedByPerson[person].items[ci];
                html += '<div>• ' + cItem.purpose + ' — ₹' + cItem.amount.toLocaleString() + '</div>';
            }
            html += '</div>';
        }

        if (expensesByPerson[person] && expensesByPerson[person].items.length > 0) {
            html += '<div style="margin-top:4px;font-size:0.72rem;color:var(--txt2);"><b>Expenses:</b>';
            var eItems = expensesByPerson[person].items;
            for (var ei = 0; ei < Math.min(eItems.length, 5); ei++) {
                html += '<div>• ' + eItems[ei].desc + ' (' + eItems[ei].category + ') — ₹' + Math.round(eItems[ei].amount).toLocaleString() + '</div>';
            }
            if (eItems.length > 5) { html += '<div>... +' + (eItems.length - 5) + ' more</div>'; }
            html += '</div>';
        }

        html += '</div>';
    }

    if (!hasData) { html += '<p class="placeholder">Record collections & add expenses to see reconciliation!</p>'; }
    container.innerHTML = html;
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

    for (var i = 0; i < allTrips.length; i++) { geocodeTrip(allTrips[i]); }
    renderPlacesList();
}

function geocodeTrip(trip) {
    fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(trip.destination))
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.length > 0) {
                var marker = L.marker([parseFloat(data[0].lat), parseFloat(data[0].lon)]).addTo(travelMap);
                marker.bindPopup('<b>' + trip.name + '</b><br>📍 ' + trip.destination + '<br>' + trip.type);
                mapMarkers.push(marker);
            }
        }).catch(function() {});
}

function renderPlacesList() {
    var container = document.getElementById('placesList');
    if (allTrips.length === 0) { container.innerHTML = '<p class="placeholder">Add trips!</p>'; return; }
    var html = '';
    for (var i = 0; i < allTrips.length; i++) {
        var t = allTrips[i];
        html += '<div class="place-item"><div><h4>' + t.type.split(' ')[0] + ' ' + t.destination + '</h4><p>' + t.name + '</p></div></div>';
    }
    container.innerHTML = html;
}

// ============ CURRENCY ============
var exchangeRates = { INR:1, USD:0.0119, EUR:0.0109, GBP:0.0094, JPY:1.78, AUD:0.0183, THB:0.41, SGD:0.016, AED:0.0437, LKR:3.55 };
var currencyNames = { INR:'Indian Rupee', USD:'US Dollar', EUR:'Euro', GBP:'British Pound', JPY:'Japanese Yen', AUD:'Australian Dollar', THB:'Thai Baht', SGD:'Singapore Dollar', AED:'UAE Dirham', LKR:'Sri Lankan Rupee' };
var currencyFlags = { INR:'🇮🇳', USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', JPY:'🇯🇵', AUD:'🇦🇺', THB:'🇹🇭', SGD:'🇸🇬', AED:'🇦🇪', LKR:'🇱🇰' };

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
    var temp = f.value; f.value = t.value; t.value = temp;
    convertCurrency();
}

function renderCurrencyTable() {
    var html = '';
    for (var code in exchangeRates) {
        if (code === 'INR') { continue; }
        html += '<div class="curr-row"><span><span class="curr-flag">' + (currencyFlags[code] || '') + '</span> ' + code + ' — ' + currencyNames[code] + '</span><span class="curr-rate">1 ' + code + ' = ₹' + (1 / exchangeRates[code]).toFixed(2) + '</span></div>';
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
    saveToCloud();
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
    saveToCloud();
    renderBucket();
}

function deleteBucket(id) {
    bucketList = bucketList.filter(function(b) { return b.id !== id; });
    localStorage.setItem('tlBucket', JSON.stringify(bucketList));
    saveToCloud();
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

    setInterval(function() {
        if (!document.body.classList.contains('dark-theme')) {
            applyTimeTheme();
            updateGreeting();
        }
    }, 60000);

    // Firebase Auth
    auth.onAuthStateChanged(function(user) {
        if (user) { onUserLoggedIn(user); }
    });

    updateDashboard();
    renderRecentTrips();
    fetchLiveRates();

    toast('TravelLog ready! 🌊', 'ok');
};
