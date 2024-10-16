document.querySelectorAll('.nav-link').forEach(function (navLink) {
    navLink.addEventListener('click', function (event) {
        event.preventDefault();
        const target = navLink.getAttribute('href');

        document.querySelectorAll('.tab-content').forEach(function (tabContent) {
            tabContent.style.display = 'none';
        });

        document.querySelector(target).style.display = 'block';
    });
});

// Set the default visible tab
document.getElementById('home').style.display = 'block';

// Function to render tabs in the list
function renderTabs(tabs) {
    let ul = document.querySelector('.list-group');
    ul.innerHTML = ''; // Clear any existing content

    tabs.forEach(function (tab) {
        // Trim the tab title to 25 characters if necessary
        let title = tab.title.length > 25 ? tab.title.substring(0, 25) + '...' : tab.title;

        // Create a list item element
        let li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between';
        li.textContent = title;

        // Set a data attribute to store the tab ID
        li.setAttribute('data-tab-id', tab.id);

        // Create a div for the buttons
        let buttonDiv = document.createElement('div');

        // Add buttons (add and send)
        ['add.png', 'send.png'].forEach(function (icon) {
            let button = document.createElement('button');
            button.className = 'btn btn-light btn-sm';

            let img = document.createElement('img');
            img.src = `img/${icon}`;
            img.alt = icon.replace('.png', ' Icon');
            img.className = 'task-icon';

            button.appendChild(img);
            buttonDiv.appendChild(button);

            // Add click event for the Add button to show the overlay
            if (icon === 'add.png') {
                button.addEventListener('click', function (event) {
                    showOverlayForHomeTab(tab.id);
                    event.stopPropagation(); // Prevent triggering the list item click
                    document.getElementById('overlay').style.display = 'flex'; // Show overlay
                });
            }
        });

        // Close the overlay when the "X" icon is clicked
        document.getElementById('closeOverlay').addEventListener('click', function () {
            document.getElementById('overlay').style.display = 'none'; // Hide overlay
        });


        // Add pin button
        let pinButton = document.createElement('button');
        pinButton.className = 'btn btn-light btn-sm';
        pinButton.setAttribute('data-pinned', tab.pinned); // Store the initial pinned state

        let pinImg = document.createElement('img');
        pinImg.src = tab.pinned ? 'img/unpin.png' : 'img/pin.png'; // Use different images for active/inactive
        pinImg.alt = 'Pin Icon';
        pinImg.className = 'task-icon';

        pinButton.appendChild(pinImg);
        buttonDiv.appendChild(pinButton);

        // Add close button
        let closeButton = document.createElement('button');
        closeButton.className = 'btn btn-light btn-sm';

        let closeImg = document.createElement('img');
        closeImg.src = 'img/close-button.png';
        closeImg.alt = 'Close Icon';
        closeImg.className = 'task-icon';

        closeButton.appendChild(closeImg);
        buttonDiv.appendChild(closeButton);

        // Append the button div to the list item
        li.appendChild(buttonDiv);

        // Append the list item to the unordered list
        ul.appendChild(li);

        // Add a click event listener to the list item to open the tab
        li.addEventListener('click', function () {
            let tabId = li.getAttribute('data-tab-id');
            chrome.tabs.update(parseInt(tabId), { active: true });
        });

        // Add a click event listener to the send button to copy the link to clipboard
        buttonDiv.children[1].addEventListener('click', function (event) { // Adjust index if needed
            event.stopPropagation(); // Prevent triggering the list item click
            let tabId = li.getAttribute('data-tab-id');

            // Use chrome.tabs.get to get the tab's details
            chrome.tabs.get(parseInt(tabId), function (tab) {
                if (tab && tab.url) {
                    // Copy the tab's URL to clipboard
                    navigator.clipboard.writeText(tab.url).then(function () {
                        console.log('Link copied to clipboard');
                        showToast('Link copied to clipboard: ' + tab.url);
                    }).catch(function (error) {
                        console.error('Could not copy text: ', error);
                    });
                }
            });
        });

        // Add a click event listener to the pin button to toggle pinning
        pinButton.addEventListener('click', function (event) {
            event.stopPropagation(); // Prevent triggering the list item click
            let tabId = li.getAttribute('data-tab-id');

            // Check the current pinned state
            let isPinned = pinButton.getAttribute('data-pinned') === 'true';

            // Toggle pin/unpin
            chrome.tabs.update(parseInt(tabId), { pinned: !isPinned }, function (updatedTab) {
                // Update the button state and image
                pinButton.setAttribute('data-pinned', !isPinned);
                pinImg.src = !isPinned ? 'img/unpin.png' : 'img/pin.png'; // Change icon based on pin state
            });
        });

        // Add a click event listener to the close button to close the tab
        closeButton.addEventListener('click', function (event) {
            event.stopPropagation(); // Prevent triggering the list item click
            let tabId = li.getAttribute('data-tab-id');
            chrome.tabs.remove(parseInt(tabId), function () {
                // Optionally, remove the list item from the UI after closing the tab
                li.remove();
            });
        });
    });
}

// Function to filter the tabs based on search input
function filterTabs(searchTerm) {
    let ul = document.querySelector('.list-group');
    let items = ul.getElementsByTagName('li');

    for (let item of items) {
        // Check if the search term is in the item's text
        if (item.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
            item.style.display = ''; // Show item
        } else {
            item.style.display = 'none'; // Hide item
        }
    }
}

// Query tabs and render them
chrome.tabs.query({}, function (tabs) {
    renderTabs(tabs);
});

// Event listener for search input
document.getElementById('searchInput').addEventListener('input', function () {
    let searchTerm = this.value;
    filterTabs(searchTerm);
});

// Event listener for search button click
document.getElementById('searchButton').addEventListener('click', function () {
    let searchTerm = document.getElementById('searchInput').value;
    filterTabs(searchTerm);
});

// Show toast notification
function showToast(message) {
    let toast = document.createElement('div');
    toast.className = 'toast'; // Add the toast class
    toast.textContent = message;

    document.body.appendChild(toast); // Append the toast to the body

    // Display the toast
    toast.style.display = 'block';

    // Remove the toast after the animation duration
    setTimeout(() => {
        toast.remove();
    }, 3000); // Change duration as needed (should match the CSS animation duration)
}


function fetchMemoryUsage() {
    let totalMemoryUsage = 0;

    // Fetch total memory information first
    chrome.system.memory.getInfo(function (memoryInfo) {
        const totalMemoryInMb = (memoryInfo.capacity / 1024 / 1024).toFixed(2);
        const totalLabel = document.getElementById('usage');
        totalLabel.innerHTML = ''; // Clear previous total usage

        chrome.tabs.query({}, function (tabs) {
            const memoryList = document.getElementById('memory-list');
            memoryList.innerHTML = ''; // Clear existing content

            tabs.forEach(tab => {
                // Check if the tab is a standard web page and not hibernated
                if (!tab.url.startsWith("chrome://") &&
                    !tab.url.startsWith("chrome-extension://") &&
                    !tab.discarded) { // Only process non-hibernated tabs
                    // Create a list item for each tab
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between';

                    // Inject a script into each tab to get the memory information
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: getMemoryInfo
                    }, (result) => {
                        if (chrome.runtime.lastError || !result || !result[0].result) {
                            console.error('Error retrieving memory info for tab:', tab.title, 'Error:', chrome.runtime.lastError);
                            return;
                        }

                        const memoryInfo = result[0].result;
                        const jsHeapUsedMB = memoryInfo.usedJSHeapSize / (1024 * 1024); // JS Heap in MB
                        const resourcesMemoryMB = memoryInfo.resourcesMemory / (1024 * 1024); // Resources memory in MB
                        const mediaMemoryMB = memoryInfo.mediaMemory / (1024 * 1024); // Media files memory in MB

                        const totalMemoryUsedMB = jsHeapUsedMB + resourcesMemoryMB + mediaMemoryMB; // Total memory usage in MB
                        const tabTitle = tab.title.length > 25 ? tab.title.substring(0, 25) + '...' : tab.title;

                        // Update the UI with total memory usage
                        li.innerHTML = `<span>${tabTitle}</span>
                                        <span>${totalMemoryUsedMB.toFixed(2)} MB</span>`;
                        memoryList.appendChild(li);
                        totalMemoryUsage += totalMemoryUsedMB;

                        // Update the total usage display
                        totalLabel.innerHTML = `Used: ${totalMemoryUsage.toFixed(2)} MB / Total: ${totalMemoryInMb} MB`;
                    });
                }
            });
        });
    });
}

// Set an interval to fetch memory usage every 10 seconds
setInterval(fetchMemoryUsage, 10000);

// This function runs in the context of each tab
function getMemoryInfo() {
    let usedJSHeapSize = 0;
    let resourcesMemory = 0;
    let mediaMemory = 0;

    // JS Heap size
    if (performance && performance.memory) {
        usedJSHeapSize = performance.memory.usedJSHeapSize || 0;
    }

    // Estimate memory used by resources (HTML, CSS, images, etc.)
    if (performance && performance.getEntries) {
        const entries = performance.getEntries();

        entries.forEach((entry) => {
            if (entry.initiatorType === 'img' || entry.initiatorType === 'css' || entry.initiatorType === 'xmlhttprequest') {
                resourcesMemory += entry.transferSize || 0; // Transfer size for resources like CSS, HTML, and images
            }
        });
    }

    // Directly check for media elements in the DOM
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((media) => {
        if (media instanceof HTMLMediaElement) {
            if (media.buffered.length > 0) {
                // Estimate media memory by the buffered size and duration
                mediaMemory += media.duration * 10 * 1024 * 1024; // Estimation: 10MB per minute as rough memory usage.
            } else if (media.readyState >= 2) {
                // Fallback: Estimate based on media file size
                const mediaSize = media.videoWidth * media.videoHeight * 3 * media.duration; // Very rough estimate of video memory
                mediaMemory += mediaSize;
            }
        }
    });

    return {
        usedJSHeapSize: usedJSHeapSize,
        resourcesMemory: resourcesMemory,
        mediaMemory: mediaMemory
    };
}

// Event listener to show the memory tab and fetch memory usage
document.querySelectorAll('.nav-link').forEach(function (navLink) {
    navLink.addEventListener('click', function (event) {
        event.preventDefault();
        const target = navLink.getAttribute('href');

        document.querySelectorAll('.tab-content').forEach(function (tabContent) {
            tabContent.style.display = 'none';
        });

        document.querySelector(target).style.display = 'block';

        // Fetch memory usage if memory tab is selected
        if (target === '#memory') {
            fetchMemoryUsage();
        }
    });
});

// Function to filter the memory usage items based on search input
function filterMemoryUsage(searchTerm) {
    let memoryList = document.getElementById('memory-list');
    let items = memoryList.getElementsByTagName('li');

    for (let item of items) {
        // Check if the search term is in the item's text
        if (item.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
            item.style.display = ''; // Show item
        } else {
            item.style.display = 'none'; // Hide item
        }
    }
}

// Event listener for the memory search input
document.getElementById('memorySearchInput').addEventListener('input', function () {
    let searchTerm = this.value;
    filterMemoryUsage(searchTerm); // Filter results in real-time
});

document.getElementById('MemorysearchButton').addEventListener('click', function () {
    let searchTerm = document.getElementById('memorySearchInput').value;
    filterMemoryUsage(searchTerm);
});


// Function to render opened tabs with Hibernate and Save buttons in the settings section
function renderSettingsTabs(tabs) {
    let settingsList = document.getElementById('settings-list');
    settingsList.innerHTML = ''; // Clear any existing content

    // Retrieve saved sessions and hibernated tabs from local storage
    let savedSessions = JSON.parse(localStorage.getItem('savedSessions')) || [];
    const hibernatedTabs = JSON.parse(localStorage.getItem('hibernatedTabs')) || {};

    // Display saved sessions
    if (savedSessions.length > 0) {
        savedSessions.forEach(function (savedSession) {
            let li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            savedSession.title = savedSession.title.length > 25 ? savedSession.title.substring(0, 25) + '...' : savedSession.title;
            li.textContent = `${savedSession.title}`; // Indicate it's saved
            li.setAttribute('data-tab-id', savedSession.id); // Use saved session ID

            let buttonDiv = document.createElement('div');

            // Add Restore button
            let restoreButton = document.createElement('button');
            restoreButton.className = 'btn btn-light btn-sm';
            let restoreImg = document.createElement('img');
            restoreImg.src = 'img/restore.png';
            restoreImg.alt = 'Restore Icon';
            restoreImg.className = 'setting-icon';
            restoreButton.appendChild(restoreImg);
            buttonDiv.appendChild(restoreButton);

            li.appendChild(buttonDiv);
            settingsList.appendChild(li);

            // Restore button event listener
            restoreButton.addEventListener('click', function () {
                // Create a new tab with the session's URL
                chrome.tabs.create({ url: savedSession.url, active: true }, function (newTab) {
                    console.log('Restored session tab:', savedSession.title);
                    showToast(`Session restored: ${savedSession.title}`);

                    // Remove the session from local storage after restoring
                    savedSessions = savedSessions.filter(session => session.id !== savedSession.id); // Remove the session from the array
                    localStorage.setItem('savedSessions', JSON.stringify(savedSessions)); // Update local storage

                    // Re-render the settings to reflect the change (i.e., remove the restored session)
                    renderSettingsTabs(tabs); // Re-render the settings
                });
            });
        });
    }

    // Now display open tabs that are not saved
    tabs.forEach(function (tab) {
        let isHibernated = hibernatedTabs[tab.id]; // Check if tab is hibernated
        let isSaved = savedSessions.some(session => session.id === tab.id);
        let title = tab.title.length > 25 ? tab.title.substring(0, 25) + '...' : tab.title;

        // Create list item for the tab
        let li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = title;

        // Set a data attribute to store the tab ID and status
        li.setAttribute('data-tab-id', tab.id);
        li.setAttribute('data-tab-status', tab.discarded ? 'discarded' : 'active');

        let buttonDiv = document.createElement('div');

        // Create the hibernate and play buttons
        let hibernateButton = document.createElement('button');
        hibernateButton.className = 'btn btn-light btn-sm';

        let hibernateImg = document.createElement('img');
        hibernateImg.className = 'setting-icon';

        if (isHibernated || tab.discarded) {
            // If the tab is hibernated, show the "Play" button
            hibernateImg.src = 'img/play.png';
            hibernateImg.alt = 'Activate Icon';
            hibernateButton.appendChild(hibernateImg);

            // Event listener for switching to the hibernated tab
            hibernateButton.addEventListener('click', function () {
                // Switch to the tab without restoring or activating it
                chrome.tabs.update(tab.id, { active: true }, function () {
                    console.log('Switched to hibernated tab:', tab.title);
                    showToast(`Switched to tab: ${title}`);
                });
            });
        } else {
            // If the tab is active, show the "Hibernate" button
            hibernateImg.src = 'img/hibernate.png';
            hibernateImg.alt = 'Hibernate Icon';
            hibernateButton.appendChild(hibernateImg);

            // Event listener for hibernating the active tab
            hibernateButton.addEventListener('click', function (event) {
                event.stopPropagation();
                let tabId = li.getAttribute('data-tab-id');

                chrome.tabs.discard(parseInt(tabId), function () {
                    console.log('Tab hibernated:', tabId);
                    showToast(`Tab hibernated: ${title}`);

                    // Change the button to "Play" after hibernation
                    hibernateImg.src = 'img/play.png';
                    hibernateImg.alt = 'Activate Icon';
                    li.setAttribute('data-tab-status', 'discarded');

                    // Store the hibernated state in localStorage
                    hibernatedTabs[tabId] = true;
                    localStorage.setItem('hibernatedTabs', JSON.stringify(hibernatedTabs));
                });
            });
        }

        buttonDiv.appendChild(hibernateButton);

        // If the tab is not saved, display it
        if (!isSaved) {
            // Add Save button
            let saveButton = document.createElement('button');
            saveButton.className = 'btn btn-light btn-sm';
            let saveImg = document.createElement('img');
            saveImg.src = 'img/save.png';
            saveImg.alt = 'Save Icon';
            saveImg.className = 'setting-icon';
            saveButton.appendChild(saveImg);
            buttonDiv.appendChild(saveButton);

            li.appendChild(buttonDiv);
            settingsList.appendChild(li);

            // Save button event listener
            saveButton.addEventListener('click', function (event) {
                event.stopPropagation();
                let tabId = li.getAttribute('data-tab-id');
                chrome.tabs.get(parseInt(tabId), function (tab) {
                    if (tab && tab.url) {
                        let sessionTab = { title: tab.title, url: tab.url, id: tab.id, discarded: tab.discarded };
                        let savedSessions = JSON.parse(localStorage.getItem('savedSessions')) || [];

                        // Check for duplicates before saving
                        let isDuplicate = savedSessions.some(session => session.url === sessionTab.url || session.id === sessionTab.id);
                        if (!isDuplicate) {
                            savedSessions.push(sessionTab);
                            localStorage.setItem('savedSessions', JSON.stringify(savedSessions));
                            showToast(`Tab saved as session: ${tab.title}`);

                            // Remove the tab from the settings list after saving
                            li.remove();

                            // Change the save button to a restore button
                            saveButton.innerHTML = '';
                            let restoreImg = document.createElement('img');
                            restoreImg.src = 'img/restore.png';
                            restoreImg.alt = 'Restore Icon';
                            restoreImg.className = 'setting-icon';
                            saveButton.appendChild(restoreImg);

                            // Re-render the saved sessions to include the new session
                            renderSettingsTabs(tabs);
                        } else {
                            showToast(`Session already saved: ${tab.title}`);
                        }
                    }
                });
            });
        }
    });
}

// Fetch and render opened tabs in the settings tab
chrome.tabs.query({}, function (tabs) {
    renderSettingsTabs(tabs);
});


// Function to filter tabs in the settings tab based on search input
function filterSettingsTabs(searchTerm) {
    let settingsList = document.getElementById('settings-list');
    let items = settingsList.getElementsByTagName('li');

    for (let item of items) {
        // Check if the search term is in the item's text
        if (item.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
            item.style.display = ''; // Show item
        } else {
            item.style.display = 'none'; // Hide item
        }
    }
}

// Event listener for search input in settings tab
document.getElementById('settingSearchInput').addEventListener('input', function () {
    let searchTerm = this.value;
    filterSettingsTabs(searchTerm);
});

document.getElementById('SettingsearchButton').addEventListener('click', function () {
    let searchTerm = document.getElementById('settingsSearchInput').value;
    filterSettingsTabs(searchTerm);
});


let savedSessions = JSON.parse(localStorage.getItem('savedSessions')) || [];
localStorage.setItem('savedSessions', JSON.stringify(savedSessions));


function renderSavedSessions() {
    let settingsList = document.getElementById('settings-list'); // Reuse the settings list

    // Retrieve saved sessions from local storage
    let savedSessions = JSON.parse(localStorage.getItem('savedSessions')) || [];

    savedSessions.forEach(function (session, index) {
        let title = session.title.length > 25 ? session.title.substring(0, 25) + '...' : session.title;

        let li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = session.title;

        let buttonDiv = document.createElement('div');

        // Add Restore button
        let restoreButton = document.createElement('button');
        restoreButton.className = 'btn btn-light btn-sm';
        let restoreImg = document.createElement('img');
        restoreImg.src = 'img/restore.png';
        restoreImg.alt = 'Restore Icon';
        restoreImg.className = 'setting-icon';
        restoreButton.appendChild(restoreImg);
        buttonDiv.appendChild(restoreButton);

        li.appendChild(buttonDiv);
        settingsList.appendChild(li);

        // Restore button event listener
        restoreButton.addEventListener('click', function () {
            // Create a new tab with the session's URL
            chrome.tabs.create({ url: session.url, active: true }, function (newTab) {
                console.log('Restored session tab:', session.title);
                showToast(`Session restored: ${session.title}`);

                // Remove the session from local storage after restoring
                savedSessions.splice(index, 1); // Remove the session from the array
                localStorage.setItem('savedSessions', JSON.stringify(savedSessions)); // Update local storage

                // Re-render the settings to reflect the change (i.e., remove the restored session)
                renderSavedSessions(); // Re-render the saved sessions
            });
        });
    });
}



// Save tabs to session storage
function saveTabsToSession(groupId) {
    chrome.tabs.query({}, function (tabs) {
        const groupTabs = tabs.filter(tab => tab.groupId === groupId).map(tab => ({ id: tab.id, url: tab.url }));
        sessionStorage.setItem(groupId, JSON.stringify(groupTabs));
    });
}

// Restore tabs from session storage
function restoreTabsFromSession(groupId) {
    const savedGroup = JSON.parse(localStorage.getItem("groups")).find(group => group.id === groupId);
    if (!savedGroup) {
        console.log(`No saved group found for ID: ${groupId}`);
        return;
    }

    const savedTabs = JSON.parse(sessionStorage.getItem(groupId));
    if (savedTabs && savedTabs.length > 0) {
        // Get the IDs of the tabs to be restored
        const tabIdsToRestore = savedTabs.map(tab => tab.id);

        // Query for existing tabs using their IDs
        chrome.tabs.query({}, function (allTabs) {
            // Filter to only include tabs that still exist
            const existingTabs = allTabs.filter(tab => tabIdsToRestore.includes(tab.id));

            // Create a new tab group if any tabs are found
            if (existingTabs.length > 0) {
                chrome.tabs.group({ tabIds: existingTabs.map(tab => tab.id) }, function (newGroupId) {
                    if (chrome.runtime.lastError) {
                        console.error('Error creating group:', chrome.runtime.lastError);
                        return;
                    }
                    console.log(`Restored tabs in new group ID: ${newGroupId}`);
                });
            } else {
                console.log('No existing tabs to restore.');
            }
        });
    } else {
        console.log(`No saved tabs found for group ID: ${groupId}`);
    }
}


const overlay = document.getElementById("overlay");
const overlayContent = document.querySelector(".overlay-content");

overlay.addEventListener("click", function (event) {
    // Check if the click target is outside the overlay content
    if (!overlayContent.contains(event.target)) {
        overlay.style.display = "none"; // Close the overlay
    }
});

document.addEventListener('DOMContentLoaded', function () {
    // Fetch the current tab URL and populate the first input
    populateColorPicker(); // Populate the color picker
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let currentTab = tabs[0];
        let currentUrlInput = document.getElementById('groupUrlInput');
        currentUrlInput.value = currentTab.url; // Auto-fill URL input with the current tab's URL
    });

    // Handle 'Create Group Tab' button click
    document.getElementById('createGroupButton').addEventListener('click', function () {
        // Get user input values
        let groupUrl = document.getElementById('groupUrlInput').value;
        let groupName = document.getElementById('groupNameInput').value;
        let groupColor = document.getElementById('groupColorPicker').value; // Get selected color

        // Ensure the group name is valid
        if (groupName.length > 25) {
            alert("Group name should be 25 characters or less.");
            return;
        }

        // Create or Add to an Existing Tab Group using the inputs
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            let currentTab = tabs[0];

            // Check if a group with the same name already exists
            chrome.tabGroups.query({}, function (groups) {
                let existingGroup = groups.find(group => group.title === groupName);

                if (existingGroup) {
                    // If a group with the same name exists, add the tab to that group
                    chrome.tabs.group({ groupId: existingGroup.id, tabIds: currentTab.id }, function () {
                        console.log('Tab added to existing group successfully.');
                    });
                } else {
                    // If no group with the same name exists, create a new group
                    if (currentTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
                        chrome.tabGroups.update(currentTab.groupId, {
                            title: groupName,
                            color: groupColor
                        }, function () {
                            console.log('Tab group updated successfully.');
                        });
                    } else {
                        chrome.tabs.group({ tabIds: currentTab.id }, function (newGroupId) {
                            chrome.tabGroups.update(newGroupId, {
                                title: groupName,
                                color: groupColor
                            }, function () {
                                console.log('New tab group created successfully.');
                            });
                        });
                    }
                }
                // Update the list of groups after creation
                showTabGroups();
            });
        });
    });

    // Display list of all tab groups
    showTabGroups();
});

// Function to display the tab groups and their tabs with "x" button for each tab
function showTabGroups() {
    chrome.tabGroups.query({}, function (groups) {
        let groupContainer = document.getElementById('groupList');
        groupContainer.innerHTML = ''; // Clear the list before rendering new one

        groups.forEach(function (group) {
            // Create a group container
            let groupDiv = document.createElement('div');
            groupDiv.classList.add('group-container', 'mb-3');

            // Group title and color
            let groupname = document.getElementById('groupNameInput').value;
            let groupTitle = document.createElement('h3');
            groupTitle.textContent = group.title;
            groupDiv.appendChild(groupTitle);

            // Fetch the tabs in this group
            chrome.tabs.query({ groupId: group.id }, function (tabs) {
                // Create a list group for the tabs
                let tabList = document.createElement('ul');
                tabList.classList.add('list-group');

                tabs.forEach(function (tab) {
                    // Create a list item for each tab
                    let tabItem = document.createElement('li');
                    tabItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

                    // Tab title
                    let tabTitle = document.createElement('span');
                    tabTitle.textContent = tab.title;

                    // Create 'x' button to remove the tab from the group
                    let closeButton = document.createElement('button');
                    closeButton.classList.add('btn', 'btn-light', 'btn-sm', 'p-1', 'ml-2');

                    // Set the background image for the button using your icon file
                    closeButton.style.backgroundImage = 'url(img/close-button.png)'; // Update with the correct path
                    closeButton.style.backgroundSize = 'contain'; // Scale to fit
                    closeButton.style.backgroundRepeat = 'no-repeat'; // Prevent repeat
                    closeButton.style.width = '16px'; // Width of the icon
                    closeButton.style.height = '16px'; // Height of the icon
                    closeButton.style.border = 'none'; // Remove border
                    closeButton.style.cursor = 'pointer'; // Change cursor to pointer

                    // Add an event listener to the close button
                    closeButton.addEventListener('click', function () {
                        removeTabFromGroup(tab.id); // Remove tab from group function
                    });

                    // Append title and remove button to the list item
                    tabItem.appendChild(tabTitle);
                    tabItem.appendChild(closeButton);

                    // Append the list item to the tab list
                    tabList.appendChild(tabItem);
                });

                // Append the tab list to the group div
                groupDiv.appendChild(tabList);
            });

            // Append the group div to the container
            groupContainer.appendChild(groupDiv);
        });
    });
}

// Function to remove a tab from the group
function removeTabFromGroup(tabId) {
    chrome.tabs.ungroup(tabId, function () {
        console.log("Tab removed from group successfully.");
        showTabGroups(); // Refresh the group list after removing the tab
    });
}


const chromeTabGroupColors = [
    { name: 'grey', hex: '#808080' },
    { name: 'blue', hex: '#1E90FF' },
    { name: 'red', hex: '#FF4500' },
    { name: 'yellow', hex: '#FFD700' },
    { name: 'green', hex: '#32CD32' },
    { name: 'pink', hex: '#FF69B4' },
    { name: 'purple', hex: '#8A2BE2' },
    { name: 'cyan', hex: '#00FFFF' }
];

function populateColorPicker() {
    const colorPicker = document.getElementById('groupColorPicker');
    colorPicker.innerHTML = ''; // Clear any existing options

    chromeTabGroupColors.forEach(color => {
        const option = document.createElement('option');
        option.value = color.name; // Use the name as the value

        // Add style to the option for color preview
        option.style.backgroundColor = color.hex;
        option.style.color = color.hex; // Hide text by matching it to the background
        option.textContent = color.name; // Text for accessibility

        colorPicker.appendChild(option);
    });
}

// Function to display the tab groups and their tabs in the overlay (without buttons)
function showTabGroupsInOverlay(tabId) {
    chrome.tabGroups.query({}, function (groups) {
        let overlayContent = document.querySelector('.overlay-content');
        overlayContent.innerHTML = ''; // Clear overlay content before rendering

        groups.forEach(function (group) {
            let groupDiv = document.createElement('div');
            groupDiv.classList.add('group-container', 'mb-3', 'clickable-group');

            let groupTitle = document.createElement('p');
            groupTitle.textContent = group.title;
            groupTitle.style.color = group.color;
            groupDiv.appendChild(groupTitle);

            // Add event listener to add the selected tab to the chosen group
            groupDiv.addEventListener('click', function () {
                addTabToGroup(tabId, group.id, group.title); // Use the passed tabId and groupId
                overlay.style.display = "none"; // Hide overlay after adding
            });

            overlayContent.appendChild(groupDiv);
        });
    });
}

// Function to display the overlay when the home tab is clicked
function showOverlayForHomeTab(tabId) {
    overlay.style.display = 'block'; // Show the overlay
    showTabGroupsInOverlay(tabId); // Pass the tab ID to show groups
}

// Hide overlay when clicking outside of it
overlay.addEventListener("click", function (event) {
    if (!overlayContent.contains(event.target)) {
        overlay.style.display = "none"; // Close the overlay
    }
});

function addTabToGroup(tabId, groupId, groupName) {
    chrome.tabs.group({ groupId: groupId, tabIds: tabId }, function () {
        console.log(`Tab with ID ${tabId} added to group: ${groupName}`);
        showToast(`Tab added to group: ${groupName}`);
        showTabGroups(); // Refresh the groups
    });
}
