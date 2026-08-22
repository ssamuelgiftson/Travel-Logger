<div align="center">

# 🌊 TravelLog

### Your Personal Travel Companion

[![Live Website](https://img.shields.io/badge/🌐_Live_Website-Visit_Now-0ea5e9?style=for-the-badge)](https://travel-logger-samuel.netlify.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-1e293b?style=for-the-badge&logo=github)](https://github.com/ssamuelgiftson/travel-logger)

<img src="https://img.shields.io/badge/Theme-Beach_🏖️-0ea5e9?style=flat-square" />
<img src="https://img.shields.io/badge/Auth-Google_🔐-f43f5e?style=flat-square" />
<img src="https://img.shields.io/badge/Map-Leaflet_🗺️-10b981?style=flat-square" />
<img src="https://img.shields.io/badge/Chat-Real--time_💬-7c3aed?style=flat-square" />
<img src="https://img.shields.io/badge/Currency-Live_Rates_💱-f59e0b?style=flat-square" />

---

*Built with 🌊 by **Samuel Giftson S***

</div>

---

## 🌟 What is TravelLog?

**TravelLog** is a personal travel companion web app where you can plan trips with friends, track & split expenses, chat in groups, view places on an interactive map, convert currencies, and maintain a travel bucket list — all with a beautiful beach-themed UI that automatically changes with the time of day!

---

## ✨ Features

### 🔐 Google Sign-In
- One-click Google authentication
- Profile picture & name in navbar
- Secure — powered by Firebase

### 👥 Travel Groups
- Create travel groups for trips with friends
- Share group code to invite others
- Real-time group chat
- Send money requests in chat (`/pay 500 for lunch`)
- Group expense tracking & splitting

### 💬 Real-Time Group Chat
- Instant messaging with group members
- See sender name & profile picture
- Send money payment requests
- Messages stored in Firebase (persistent)

### 🏖️ Dynamic Beach Theme
- **🌅 Morning (5am-12pm)** — Warm sunrise (orange, pink, gold)
- **☀️ Afternoon (12pm-5pm)** — Bright beach (sky blue, ocean teal)
- **🌇 Evening (5pm-9pm)** — Sunset (deep red, purple, magenta)
- **🌙 Night (9pm-5am)** — Moonlit ocean (dark navy, silver blue)
- Theme changes automatically every minute!
- Manual dark mode toggle available

### ✈️ Trip Planning
- Create trips with name, destination, dates
- Choose trip type (Beach, Mountain, City, Heritage, Nature, Adventure)
- Link trips to groups for shared expenses
- View trip status (Upcoming, Ongoing, Completed)
- Filter trips by status

### 📅 Day-by-Day Itinerary
- Auto-generated day cards based on trip duration
- Add activities for each day
- Check off completed activities
- Add extra days as needed

### 💰 Expense Tracker & Splitter
- Log expenses by category (Food, Hotel, Transport, Tickets, Shopping, Other)
- Select who paid
- Split expenses between group members
- Category-wise summary with visual bar chart
- **Settle Up** — See who owes whom and how much!

### 🗺️ Interactive World Map
- All trip locations marked on map
- Auto-geocoding of destinations
- Clickable markers with trip info
- Powered by Leaflet + OpenStreetMap

### 💱 Currency Converter
- 10 currencies supported (INR, USD, EUR, GBP, JPY, AUD, THB, SGD, AED, LKR)
- Live exchange rates with offline fallback
- Swap currencies button
- Quick reference table

### 🎯 Bucket List
- Add dream travel destinations
- Write reasons why you want to visit
- Check off places you've been
- Delete completed items

### 👋 Personalized Greeting
- Time-based greeting messages:
  - 🌅 "A perfect day for an adventure!"
  - ☀️ "Where will the sun take you today?"
  - 🌇 "Golden hour — time to explore!"
  - 🌙 "Dream of your next destination!"

---

## 🛠️ Built With

| Technology | Purpose |
|---|---|
| **HTML5** | Structure & Layout |
| **CSS3** | Beach theme & time-based styling |
| **Vanilla JavaScript** | All functionality |
| **Firebase Auth** | Google Sign-In |
| **Firebase Firestore** | Groups, chat, shared expenses |
| **Leaflet.js** | Interactive maps |
| **OpenStreetMap** | Map tiles |
| **Nominatim** | Geocoding |
| **ExchangeRate API** | Live currency rates |
| **localStorage** | Local data persistence |
| **Netlify** | Hosting & deployment |

---

## 🚀 Live Demo

👉 **[https://travel-logger-samuel.netlify.app/](https://travel-logger-samuel.netlify.app/)**

---

## 📸 Theme Previews

### 🌅 Morning (5am - 12pm)
> Warm sunrise gradient — soft orange, pink, gold

### ☀️ Afternoon (12pm - 5pm)
> Bright beach — sky blue, ocean teal, sand yellow

### 🌇 Evening (5pm - 9pm)
> Sunset — deep red, purple, magenta

### 🌙 Night (9pm - 5am)
> Moonlit ocean — dark navy, deep blue, silver

---

## 📋 Pages

| Page | Description |
|---|---|
| 🏠 **Home** | Dashboard with stats & recent trips |
| ➕ **New Trip** | Create trip with details |
| ✈️ **My Trips** | All trips with status filters |
| 📍 **Trip View** | Itinerary + expenses + settle up |
| 👥 **Groups** | Create/join travel groups |
| 👥 **Group View** | Members + chat + group expenses |
| 💰 **Expenses** | All expenses with category chart |
| 🗺️ **Map** | Interactive world map |
| 💱 **Currency** | Convert between 10 currencies |
| 🎯 **Bucket List** | Dream destinations checklist |

---

## 💬 Chat Commands

| Command | What It Does |
|---|---|
| `Hello everyone!` | Sends normal message |
| `/pay 500 for lunch` | Sends ₹500 payment request card |
| `/pay 1000 for hotel` | Sends ₹1000 payment request card |

---

## 📁 Project Structure
