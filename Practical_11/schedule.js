/**
 * ==============================================================================
 * Practical 11: Dynamic Class Scheduler & Countdown
 * File: schedule.js (ES6 Module)
 * 
 * Demonstrates:
 * - ES6 Modules: Exporting constants and functions using `export`
 * - Functional array methods: filter(), sort(), find(), map()
 * - Date and Time object manipulation in JavaScript
 * ==============================================================================
 */

// Default timetable schedule for college lectures
export const DEFAULT_CLASSES = [
    { id: 1, name: "JavaScript & Web Tech", time: "09:00" },
    { id: 2, name: "Database Management Systems", time: "10:30" },
    { id: 3, name: "Computer Networks", time: "13:00" },
    { id: 4, name: "Machine Learning", time: "15:00" },
    { id: 5, name: "Compiler Construction", time: "17:00" }
];

// Active schedule array (initialized with default classes)
export let classes = DEFAULT_CLASSES.map(item => ({ ...item }));

/**
 * Converts a 24-hour time string ("HH:MM") into today's JavaScript Date object
 * @param {string} time - Time in "HH:MM" 24-hour format
 * @param {Date} [baseDate=new Date()] - Reference date (defaults to current system time)
 * @returns {Date} Date instance configured to today's date with the specified hours and minutes
 */
export function getClassDate(time, baseDate = new Date()) {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date(baseDate.getTime());
    date.setHours(hours, minutes, 0, 0); // Sets hours, minutes, seconds=0, milliseconds=0
    return date;
}

/**
 * Formats a 24-hour time string ("HH:MM") into a human-readable 12-hour format ("hh:mm AM/PM")
 * @param {string} time - Time in "HH:MM" format
 * @returns {string} Formatted string, e.g. "9:00 AM" or "1:30 PM"
 */
export function formatTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

/**
 * Returns all upcoming classes that occur strictly after the given reference time,
 * sorted in chronological order.
 * @param {Date} [now=new Date()] - Reference time
 * @returns {Array<Object>} Sorted array of upcoming class objects
 */
export function getUpcomingClasses(now = new Date()) {
    return classes
        .filter(item => getClassDate(item.time, now) > now)
        .sort((a, b) => getClassDate(a.time, now) - getClassDate(b.time, now));
}

/**
 * Identifies the very next upcoming class chronologically.
 * @param {Date} [now=new Date()] - Reference time
 * @returns {Object|null} The earliest upcoming class, or null if none remain today
 */
export function getNextClass(now = new Date()) {
    const upcoming = getUpcomingClasses(now);
    return upcoming.length > 0 ? upcoming[0] : null;
}

/**
 * Determines whether a class is 'completed', 'next', or 'upcoming'.
 * - 'completed': Class scheduled time has already passed today
 * - 'next': Class is the immediate next upcoming class
 * - 'upcoming': Class is scheduled for later today
 * 
 * @param {Object} classItem - The class object to inspect
 * @param {Date} [now=new Date()] - Current system time
 * @param {Object|null} [nextClass=null] - Currently active next upcoming class
 * @returns {'completed'|'next'|'upcoming'}
 */
export function getClassStatus(classItem, now = new Date(), nextClass = null) {
    const classDate = getClassDate(classItem.time, now);
    if (classDate <= now) {
        return "completed";
    }
    if (nextClass && nextClass.id === classItem.id) {
        return "next";
    }
    return "upcoming";
}

/**
 * Adds a new class to the schedule list and keeps the timetable sorted.
 * @param {string} name - Subject / Class name
 * @param {string} time - Time string in "HH:MM" format
 * @returns {Object} Newly created class object
 */
export function addClass(name, time) {
    const newClass = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: name.trim(),
        time: time
    };
    classes.push(newClass);
    // Keep classes sorted chronologically by time
    classes.sort((a, b) => a.time.localeCompare(b.time));
    return newClass;
}

/**
 * Deletes a class from the active schedule by its unique ID.
 * @param {number|string} id - Unique identifier of the class
 * @returns {boolean} True if class was found and removed, false otherwise
 */
export function removeClass(id) {
    const originalLength = classes.length;
    classes = classes.filter(item => item.id !== id);
    return classes.length < originalLength;
}

/**
 * Resets the class timetable back to the original default college classes.
 * @returns {Array<Object>} Fresh copy of default classes
 */
export function resetDefaultClasses() {
    classes = DEFAULT_CLASSES.map(item => ({ ...item }));
    return classes;
}

/**
 * Adds a quick demo test class starting shortly in the future (between 30s to 75s).
 * Ideal for viva, lab demonstrations, and testing real-time countdown & notifications!
 * 
 * @param {string} [name="⚡ Live Demo Class"] - Subject name for the test class
 * @returns {Object} The created demo class object
 */
export function addQuickDemoClass(name = "⚡ Live Demo Class") {
    const now = new Date();
    // Schedule target for next minute (at least 30 seconds away)
    const target = new Date(now.getTime() + 60 * 1000);
    
    // Check if HH:MM:00 would have less than 20 seconds remaining
    const testDate = new Date();
    testDate.setHours(target.getHours(), target.getMinutes(), 0, 0);
    if (testDate.getTime() - now.getTime() < 20000) {
        // Add 1 more minute so user has plenty of time to view countdown
        testDate.setMinutes(testDate.getMinutes() + 1);
        target.setMinutes(target.getMinutes() + 1);
    }

    const hours = String(testDate.getHours()).padStart(2, "0");
    const minutes = String(testDate.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    return addClass(name, timeStr);
}
