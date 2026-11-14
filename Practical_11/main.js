/**
 * ==============================================================================
 * Practical 11: Dynamic Class Scheduler & Countdown
 * File: main.js (ES6 Module Entry Point)
 * 
 * Demonstrates:
 * - ES6 Modules: Importing functions and state using `import { ... } from './schedule.js'`
 * - JavaScript Timers:
 *     1) `setInterval()` for updating the system clock and 1-second countdown ticker
 *     2) `setTimeout()` for scheduled future class notifications & toast auto-dismiss
 * - Real-time dynamic DOM updates and interactive event handling
 * ==============================================================================
 */

// Import functions and data from our schedule ES6 module
import {
    classes,
    getNextClass,
    getClassDate,
    formatTime,
    getClassStatus,
    addClass,
    removeClass,
    resetDefaultClasses,
    addQuickDemoClass
} from "./schedule.js";

// ------------------------------------------------------------------------------
// DOM Element References
// ------------------------------------------------------------------------------
const clockEl = document.getElementById("clock");
const todayEl = document.getElementById("today");
const classNameEl = document.getElementById("className");
const classTimeEl = document.getElementById("classTime");
const classListEl = document.getElementById("classList");
const statusEl = document.getElementById("status");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const nextClassBadgeEl = document.getElementById("nextClassBadge");
const scheduleStatsEl = document.getElementById("scheduleStats");

// Notification elements
const notificationEl = document.getElementById("notification");
const notificationTextEl = document.getElementById("notificationText");
const notificationCloseBtn = document.getElementById("notificationClose");

// Form & action controls
const addClassForm = document.getElementById("addClassForm");
const newClassNameInput = document.getElementById("newClassName");
const newClassTimeInput = document.getElementById("newClassTime");
const quickDemoBtn = document.getElementById("quickDemoBtn");
const resetScheduleBtn = document.getElementById("resetScheduleBtn");

// ------------------------------------------------------------------------------
// State Tracking for JavaScript Timers
// ------------------------------------------------------------------------------

/**
 * Stores the timer ID returned by setTimeout() for the upcoming class notification.
 * This timer executes once in the future when the class begins.
 */
let classStartTimeoutId = null;

/**
 * Tracks the ID of the class currently scheduled with setTimeout().
 * Prevents unnecessary re-scheduling on every setInterval tick.
 */
let currentScheduledClassId = null;

/**
 * Stores the timer ID returned by setTimeout() for auto-dismissing notifications.
 */
let toastDismissTimeoutId = null;

/**
 * Keeps track of classes that have already triggered an alert to avoid duplicate alerts.
 */
const notifiedClassIds = new Set();

/**
 * Cache for DOM rendering state to avoid needless DOM rebuilds when data hasn't changed.
 */
let lastRenderSignature = "";

// ------------------------------------------------------------------------------
// Concept 1: Live System Clock (Updated via setInterval)
// ------------------------------------------------------------------------------

/**
 * Updates the digital clock and today's date using the native system time.
 * Demonstrates Date formatting and real-time DOM updates.
 */
function updateClock() {
    const now = new Date();

    // Format time: HH:MM:SS with AM/PM
    if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });
    }

    // Format date: e.g. "Saturday, November 14, 2026"
    if (todayEl) {
        todayEl.textContent = now.toLocaleDateString([], {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }
}

// ------------------------------------------------------------------------------
// Concept 2: Dynamic Schedule Rendering (DOM Manipulation)
// ------------------------------------------------------------------------------

/**
 * Dynamically generates and displays the class cards in "Today's Schedule".
 * Differentiates classes into:
 *   - 'completed': Past classes (with checkmark badge)
 *   - 'next': The immediate next class (highlighted with glowing badge)
 *   - 'upcoming': Classes scheduled later today
 */
function displayClasses() {
    if (!classListEl) return;

    const now = new Date();
    const next = getNextClass(now);

    // Compute signature to check if DOM re-render is actually necessary
    const signature = classes.map(c => `${c.id}:${c.name}:${c.time}:${getClassStatus(c, now, next)}`).join("|");
    if (signature === lastRenderSignature) {
        return; // No change in schedule structure or statuses
    }
    lastRenderSignature = signature;

    // Clear existing list
    classListEl.innerHTML = "";

    if (classes.length === 0) {
        classListEl.innerHTML = `
            <div class="empty-state">
                <p>No classes scheduled for today.</p>
                <button type="button" class="btn btn-secondary btn-sm" id="emptyResetBtn">Load Timetable</button>
            </div>
        `;
        const emptyBtn = document.getElementById("emptyResetBtn");
        if (emptyBtn) {
            emptyBtn.addEventListener("click", handleResetSchedule);
        }
        updateScheduleStats(0, 0, 0, 0);
        return;
    }

    let completedCount = 0;
    let upcomingCount = 0;
    let nextCount = 0;

    classes.forEach(item => {
        const status = getClassStatus(item, now, next);
        if (status === "completed") completedCount++;
        else if (status === "next") { nextCount++; upcomingCount++; }
        else upcomingCount++;

        const card = document.createElement("div");
        card.className = `class-card status-${status}`;
        card.dataset.id = item.id;

        let badgeHtml = "";
        if (status === "completed") {
            badgeHtml = `<span class="card-badge badge-completed">✓ Completed</span>`;
        } else if (status === "next") {
            badgeHtml = `<span class="card-badge badge-next">⏳ Next Up</span>`;
        } else {
            badgeHtml = `<span class="card-badge badge-upcoming">📅 Upcoming</span>`;
        }

        card.innerHTML = `
            <div class="card-top">
                ${badgeHtml}
                <button type="button" class="card-delete-btn" title="Remove class" data-delete-id="${item.id}">&times;</button>
            </div>
            <h3 class="card-title">${escapeHtml(item.name)}</h3>
            <p class="card-time">⏰ ${formatTime(item.time)}</p>
        `;

        classListEl.appendChild(card);
    });

    // Attach delete event listeners
    const deleteBtns = classListEl.querySelectorAll(".card-delete-btn");
    deleteBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = Number(btn.getAttribute("data-delete-id"));
            handleDeleteClass(id);
        });
    });

    updateScheduleStats(classes.length, nextCount, upcomingCount - nextCount, completedCount);
}

/**
 * Updates summary count chips above the schedule list
 */
function updateScheduleStats(total, next, upcoming, completed) {
    if (!scheduleStatsEl) return;
    scheduleStatsEl.innerHTML = `
        <strong>${total}</strong> total &bull; 
        <span class="stat-highlight"><strong>${next + upcoming}</strong> remaining</span> &bull; 
        <span class="stat-completed"><strong>${completed}</strong> completed</span>
    `;
}

// ------------------------------------------------------------------------------
// Concept 3: Real-Time Countdown & Timer Management
// ------------------------------------------------------------------------------

/**
 * Computes the remaining time until the next class and updates the countdown display.
 * Runs on every tick of setInterval().
 */
function updateCountdown() {
    const now = new Date();
    const next = getNextClass(now);

    // Scenario A: No upcoming classes remain for today
    if (!next) {
        if (classNameEl) classNameEl.textContent = "No Upcoming Classes";
        if (classTimeEl) classTimeEl.textContent = "All classes completed for today!";
        if (statusEl) statusEl.textContent = "🎉 All scheduled lectures for today have finished.";
        if (hoursEl) hoursEl.textContent = "00";
        if (minutesEl) minutesEl.textContent = "00";
        if (secondsEl) secondsEl.textContent = "00";

        if (nextClassBadgeEl) {
            nextClassBadgeEl.textContent = "All Done";
            nextClassBadgeEl.className = "badge badge-completed";
        }

        // Cancel any pending notification timer since no class is pending
        clearScheduledClassTimer();

        // Refresh class cards so completed statuses are up-to-date
        displayClasses();
        return;
    }

    // Scenario B: Next upcoming class exists
    if (nextClassBadgeEl) {
        nextClassBadgeEl.textContent = "Next Up";
        nextClassBadgeEl.className = "badge badge-next";
    }

    if (classNameEl) classNameEl.textContent = next.name;
    if (classTimeEl) classTimeEl.textContent = `Starts at ${formatTime(next.time)}`;

    const targetDate = getClassDate(next.time, now);
    const difference = targetDate.getTime() - now.getTime();

    // If countdown reached or passed 0, trigger the class start alert
    if (difference <= 0) {
        if (hoursEl) hoursEl.textContent = "00";
        if (minutesEl) minutesEl.textContent = "00";
        if (secondsEl) secondsEl.textContent = "00";
        if (statusEl) statusEl.textContent = `🔔 Class is starting now!`;

        triggerClassStartNotification(next);
        displayClasses();
        return;
    }

    // Mathematical breakdown of remaining milliseconds into Hours, Minutes, and Seconds
    const totalSeconds = Math.max(0, Math.floor(difference / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Pad numbers with leading zeros (e.g. 05 instead of 5)
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, "0");
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, "0");

    // Informative status string
    let timeRemainingText = "";
    if (hours > 0) timeRemainingText += `${hours}h `;
    timeRemainingText += `${minutes}m ${seconds}s`;
    if (statusEl) {
        statusEl.textContent = `Next class starts in ${timeRemainingText}`;
    }

    // Ensure setTimeout() is scheduled for the exact time this class begins
    scheduleClassNotificationWithTimeout(next, difference);

    // Refresh class cards to maintain accurate badge states
    displayClasses();
}

/**
 * Concept 4: Using setTimeout() for Delayed Class Notification
 * 
 * Schedules a single setTimeout() to trigger exactly when the upcoming class starts.
 * Avoids recreating the timer every second if the scheduled class hasn't changed.
 * 
 * @param {Object} nextClass - Target class object
 * @param {number} delayMs - Milliseconds until class starts
 */
function scheduleClassNotificationWithTimeout(nextClass, delayMs) {
    // If a setTimeout() is already running for this exact class, let it run uninterrupted
    if (currentScheduledClassId === nextClass.id && classStartTimeoutId !== null) {
        return;
    }

    // If the next class changed, cancel previous setTimeout()
    clearScheduledClassTimer();

    currentScheduledClassId = nextClass.id;

    // Schedule delayed execution via setTimeout()
    classStartTimeoutId = setTimeout(() => {
        triggerClassStartNotification(nextClass);
        // Promptly recompute the next class once this one has started
        updateCountdown();
    }, delayMs);
}

/**
 * Clears the class start setTimeout() if active
 */
function clearScheduledClassTimer() {
    if (classStartTimeoutId !== null) {
        clearTimeout(classStartTimeoutId);
        classStartTimeoutId = null;
    }
    currentScheduledClassId = null;
}

/**
 * Triggers the alert when a class begins.
 * Prevents multiple duplicate alerts for the same class using a Set.
 * 
 * @param {Object} classItem - The class that just started
 */
function triggerClassStartNotification(classItem) {
    if (notifiedClassIds.has(classItem.id)) {
        return;
    }
    notifiedClassIds.add(classItem.id);

    // Cancel pending class timer reference
    clearScheduledClassTimer();

    // Show visual popup
    showNotification(`🔔 Your "${classItem.name}" class is starting now!`, "alert");

    // Play subtle audio chime
    playChimeSound();

    // Trigger visual highlight and refresh
    displayClasses();
}

// ------------------------------------------------------------------------------
// Concept 5: Delayed Execution for Toast Notification Auto-Dismiss (setTimeout)
// ------------------------------------------------------------------------------

/**
 * Displays a floating notification toast.
 * Uses `setTimeout()` to automatically hide the toast after 5 seconds.
 * 
 * @param {string} message - Notification text
 * @param {'info'|'success'|'alert'} [type='info'] - Visual style type
 */
function showNotification(message, type = "info") {
    if (!notificationEl || !notificationTextEl) return;

    // Clear any existing auto-dismiss timer before setting a new one
    if (toastDismissTimeoutId !== null) {
        clearTimeout(toastDismissTimeoutId);
    }

    notificationTextEl.textContent = message;
    notificationEl.classList.remove("alert", "success", "info");
    notificationEl.classList.add("show", type);

    // setTimeout() used to auto-dismiss after 5000 milliseconds (5 seconds)
    toastDismissTimeoutId = setTimeout(() => {
        hideNotification();
    }, 5000);
}

/**
 * Hides the notification toast immediately
 */
function hideNotification() {
    if (!notificationEl) return;
    notificationEl.classList.remove("show");
    if (toastDismissTimeoutId !== null) {
        clearTimeout(toastDismissTimeoutId);
        toastDismissTimeoutId = null;
    }
}

/**
 * Synthesizes a pleasant dual-tone chime notification using standard Web Audio API.
 * Demonstrates browser audio synthesis without external files or libraries.
 */
function playChimeSound() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        // Tone 1: E5 (659.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        // Tone 2: A5 (880.00 Hz) - delayed slightly for chime effect
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880.0, now + 0.15);
        gain2.gain.setValueAtTime(0.15, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.6);
    } catch {
        // Audio context may be restricted before first user interaction
    }
}

// ------------------------------------------------------------------------------
// Interactive Action Handlers (Add, Delete, Reset, Quick Demo)
// ------------------------------------------------------------------------------

/**
 * Handles adding a custom class via the form
 */
function handleAddClass(e) {
    e.preventDefault();

    const name = newClassNameInput ? newClassNameInput.value.trim() : "";
    const time = newClassTimeInput ? newClassTimeInput.value : "";

    if (!name || !time) {
        showNotification("Please provide both a subject name and time.", "alert");
        return;
    }

    const created = addClass(name, time);

    // Reset form inputs
    if (newClassNameInput) newClassNameInput.value = "";
    if (newClassTimeInput) newClassTimeInput.value = "";

    // Clear signature to force re-render
    lastRenderSignature = "";

    // Update countdown and display immediately
    updateCountdown();
    displayClasses();

    showNotification(`Added "${created.name}" at ${formatTime(created.time)} to schedule.`, "success");
}

/**
 * Handles deleting a class
 */
function handleDeleteClass(id) {
    const classToDelete = classes.find(c => c.id === id);
    const className = classToDelete ? classToDelete.name : "Class";

    const removed = removeClass(id);
    if (removed) {
        // If the deleted class was the one currently scheduled, clear the timer
        if (currentScheduledClassId === id) {
            clearScheduledClassTimer();
        }

        lastRenderSignature = "";
        updateCountdown();
        displayClasses();

        showNotification(`Removed "${className}" from schedule.`, "info");
    }
}

/**
 * Handles resetting the timetable back to default college classes
 */
function handleResetSchedule() {
    resetDefaultClasses();
    notifiedClassIds.clear();
    clearScheduledClassTimer();
    lastRenderSignature = "";

    updateCountdown();
    displayClasses();

    showNotification("Timetable reset to default college lectures.", "info");
}

/**
 * Handles adding a quick demonstration class (~1 minute in the future)
 * Perfect for college lab demonstrations and examiner evaluation!
 */
function handleQuickDemo() {
    const demo = addQuickDemoClass("⚡ Live Demo Class");
    lastRenderSignature = "";

    updateCountdown();
    displayClasses();

    showNotification(`⚡ Demo class "${demo.name}" scheduled for ${formatTime(demo.time)}! Watch the countdown.`, "success");
}

/**
 * Basic HTML escaping utility for safe DOM injection
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ------------------------------------------------------------------------------
// Event Listeners & Scheduler Initialization
// ------------------------------------------------------------------------------

/**
 * Binds DOM event listeners
 */
function setupEventListeners() {
    if (addClassForm) {
        addClassForm.addEventListener("submit", handleAddClass);
    }

    if (quickDemoBtn) {
        quickDemoBtn.addEventListener("click", handleQuickDemo);
    }

    if (resetScheduleBtn) {
        resetScheduleBtn.addEventListener("click", handleResetSchedule);
    }

    if (notificationCloseBtn) {
        notificationCloseBtn.addEventListener("click", hideNotification);
    }
}

/**
 * Initializes the scheduler application on page load
 */
function initialize() {
    setupEventListeners();

    // Run clock and countdown immediately so UI is populated without a 1-second delay
    updateClock();
    displayClasses();
    updateCountdown();

    /**
     * Concept: setInterval()
     * Executes repeatedly every 1000 milliseconds (1 second) to:
     *   1) Refresh system clock seconds
     *   2) Decrement the class countdown timer
     */
    setInterval(() => {
        updateClock();
        updateCountdown();
    }, 1000);
}

// Start application
initialize();
