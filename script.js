// Register the Service Worker for offline capability
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('Service Worker registered: ', registration);
        }).catch(registrationError => {
            console.log('Service Worker registration failed: ', registrationError);
        });
    });
}

const allTimeZones = [
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Africa/Cairo',
    'Pacific/Auckland',
    'America/St_Vincent',
    'America/Jamaica',
    'Europe/Amsterdam',
    'Europe/Vienna',
];

const locationsContainer = document.getElementById('locationsContainer');
const timezoneInput = document.getElementById('timezoneInput');
const addButton = document.getElementById('addButton');
const datalist = document.getElementById('timezones');
const emptyState = document.getElementById('emptyState');
const timeModal = document.getElementById('timeModal');
const modalLocation = document.getElementById('modalLocation');
const timeInput = document.getElementById('timeInput');
const setButton = document.getElementById('setButton');
const cancelButton = document.getElementById('cancelButton');

let trackedLocations = [];
let timerId = null;
let referenceTimeZone = null;

// Populate the datalist for suggestions
const populateDatalist = () => {
    datalist.innerHTML = allTimeZones.map(tz => `<option value="${tz}"></option>`).join('');
};

// Helper function to format time
const formatTime = (date, options) => {
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

// Render a single location card
const createLocationCard = (location) => {
    const card = document.createElement('div');
    card.className = 'relative bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-inner border border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-200 hover:shadow-lg';
    card.dataset.timezone = location.timeZone;

    // Extract a user-friendly name from the time zone identifier
    const name = location.timeZone.split('/')[1]?.replace(/_/g, ' ') || location.timeZone;

    // Card HTML structure
    card.innerHTML = `
        <div class="flex-1 text-center sm:text-left">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-1">${name}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">${location.timeZone}</p>
        </div>
        <div class="flex flex-col sm:flex-row items-center gap-4">
            <div class="text-center">
                <p class="text-lg font-medium text-gray-600 dark:text-gray-300">12 HR</p>
                <p class="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400" data-time-12hr></p>
            </div>
            <div class="text-center">
                <p class="text-lg font-medium text-gray-600 dark:text-gray-300">24 HR</p>
                <p class="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400" data-time-24hr></p>
            </div>
            <button class="set-time-btn px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" data-timezone="${location.timeZone}">
                Set Time
            </button>
        </div>
        <button
            class="remove-btn absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Remove ${name}"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;

    // Add event listener for the remove button
    card.querySelector('.remove-btn').addEventListener('click', () => {
        removeLocation(location.timeZone);
    });

    // Add event listener for the set time button
    card.querySelector('.set-time-btn').addEventListener('click', () => {
        showModal(location.timeZone);
    });

    return card;
};

// Update the time on all cards
const updateAllTimes = () => {
    const now = new Date();
    trackedLocations.forEach(loc => {
        const card = document.querySelector(`[data-timezone="${loc.timeZone}"]`);
        if (card) {
            const localTime = new Date(now.toLocaleString('en-US', { timeZone: loc.timeZone }));
            card.querySelector('[data-time-12hr]').textContent = formatTime(localTime, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
            card.querySelector('[data-time-24hr]').textContent = formatTime(localTime, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        }
    });
};

// Function to render all tracked locations
const renderLocations = () => {
    locationsContainer.innerHTML = ''; // Clear previous content
    if (trackedLocations.length === 0) {
        locationsContainer.appendChild(emptyState);
    } else {
        emptyState.remove();
        trackedLocations.forEach(loc => {
            const card = createLocationCard(loc);
            locationsContainer.appendChild(card);
        });
        updateAllTimes();
    }
};

// Add a new location to the list
const addLocation = () => {
    const newTimeZone = timezoneInput.value.trim();
    if (newTimeZone && !trackedLocations.some(loc => loc.timeZone === newTimeZone)) {
        trackedLocations.push({ timeZone: newTimeZone });
        renderLocations();
        timezoneInput.value = '';
        timezoneInput.focus();
    }
};

// Remove a location from the list
const removeLocation = (timeZoneToRemove) => {
    trackedLocations = trackedLocations.filter(loc => loc.timeZone !== timeZoneToRemove);
    renderLocations();
};

// Modal functions
const showModal = (timeZone) => {
    referenceTimeZone = timeZone;
    const name = timeZone.split('/')[1]?.replace(/_/g, ' ') || timeZone;
    modalLocation.textContent = `Time Zone: ${name} (${timeZone})`;
    
    // Set the default time in the input to the current time of that location
    const now = new Date();
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: referenceTimeZone }));
    const localTimeISO = localTime.toISOString().substring(0, 16);
    timeInput.value = localTimeISO;

    timeModal.classList.add('open');
};

const hideModal = () => {
    timeModal.classList.remove('open');
};

const setTimeFromModal = () => {
    const newTime = timeInput.value;
    if (newTime) {
        const newDate = new Date(newTime);
        
        // Stop the previous timer
        if (timerId) {
            clearInterval(timerId);
        }

        // Update the current time to the new time and restart the timer
        const now = new Date();
        const offsetMs = newDate.getTime() - now.getTime();
        timerId = setInterval(() => {
            const newNow = new Date(Date.now() + offsetMs);
            trackedLocations.forEach(loc => {
                const card = document.querySelector(`[data-timezone="${loc.timeZone}"]`);
                if (card) {
                    const localTime = new Date(newNow.toLocaleString('en-US', { timeZone: loc.timeZone }));
                    card.querySelector('[data-time-12hr]').textContent = formatTime(localTime, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                    card.querySelector('[data-time-24hr]').textContent = formatTime(localTime, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                }
            });
        }, 1000);
    }
    hideModal();
};

// Event listeners
addButton.addEventListener('click', addLocation);
timezoneInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        addLocation();
    }
});
setButton.addEventListener('click', setTimeFromModal);
cancelButton.addEventListener('click', hideModal);

// Initialize the app
const init = () => {
    populateDatalist();
    renderLocations();
    // Initial time update loop
    timerId = setInterval(updateAllTimes, 1000);
};

window.onload = init;
