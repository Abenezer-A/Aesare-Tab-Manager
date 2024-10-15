const IDLE_TIME_LIMIT = 30 * 60 * 1000; // 30 minutes in milliseconds
let lastActiveTimes = {};

// Function to remove duplicate tabs
function deduplicateTabs() {
    chrome.tabs.query({}, function(tabs) {
        let seenUrls = new Set();
        
        tabs.forEach(tab => {
            // If the URL has been seen before, close the duplicate tab
            if (seenUrls.has(tab.url)) {
                chrome.tabs.remove(tab.id, function() {
                    console.log(`Closed duplicate tab: ${tab.url}`);
                });
            } else {
                seenUrls.add(tab.url);
            }
        });
    });
}

// Function to auto-close idle tabs
function closeIdleTabs() {
    chrome.tabs.query({}, function(tabs) {
        const currentTime = Date.now();

        tabs.forEach(tab => {
            const lastActiveTime = lastActiveTimes[tab.id] || currentTime;
            const idleTime = currentTime - lastActiveTime;

            // If the tab has been idle for longer than the limit, close it
            if (idleTime > IDLE_TIME_LIMIT) {
                chrome.tabs.remove(tab.id, function() {
                    console.log(`Closed idle tab: ${tab.url}`);
                });
            }
        });
    });
}

// Event listener for active tab
chrome.tabs.onActivated.addListener(function(activeInfo) {
    const tabId = activeInfo.tabId;
    lastActiveTimes[tabId] = Date.now();
});

// Event listener for when a tab is updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        lastActiveTimes[tabId] = Date.now();
    }
});

// Periodically deduplicate and auto-close idle tabs
setInterval(deduplicateTabs, 10 * 60 * 1000); // Deduplicate every 10 minutes
setInterval(closeIdleTabs, 5 * 60 * 1000); // Check for idle tabs every 5 minutes
