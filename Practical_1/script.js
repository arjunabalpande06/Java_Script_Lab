// script.js

// 1. console.log() - Standard informational logging
console.log("External script loaded successfully.");

// 2. console.table() - Formats arrays or objects as a table
const environmentInfo = {
    browser: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    cookiesEnabled: navigator.cookieEnabled
};
console.log("User Environment Info:");
console.table(environmentInfo);

// 3. console.error() - Logs an error message to the console
if (!navigator.cookieEnabled) {
    console.error("Warning: Cookies are disabled. Some features may not work.");
}

// 4. console.trace() - Shows the execution path (stack trace) to this point
function traceExecution() {
    console.trace("Tracking initialization sequence:");
}
traceExecution();
