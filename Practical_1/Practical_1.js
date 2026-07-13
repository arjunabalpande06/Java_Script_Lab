// console.log()
console.log("External JavaScript Loaded Successfully!");

// User Environment Information
const userInfo = {
    Browser: navigator.appName,
    UserAgent: navigator.userAgent,
    Platform: navigator.platform,
    Language: navigator.language,
    ScreenWidth: screen.width,
    ScreenHeight: screen.height
};

// console.table()
console.table(userInfo);

// console.log()
console.log("Browser Information:", userInfo);

// console.error()
console.error("This is a sample error message.");

// Function for console.trace demonstration
function testTrace() {
    console.trace("Function Call Trace");
}

testTrace();