document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const videoPlayer = document.getElementById('videoPlayer'); console.log('videoPlayer:', videoPlayer);
    const uploadTejButton = document.getElementById('uploadTejButton'); console.log('uploadTejButton:', uploadTejButton);
    const uploadTejFile = document.getElementById('uploadTejFile'); console.log('uploadTejFile:', uploadTejFile);

    const videoUrlInput = document.getElementById('videoUrlInput'); console.log('videoUrlInput:', videoUrlInput);
    const loadVideoUrlButton = document.getElementById('loadVideoUrlButton'); console.log('loadVideoUrlButton:', loadVideoUrlButton);

    // NEW Fullscreen Button reference
    const fullscreenButton = document.getElementById('fullscreenButton'); console.log('fullscreenButton:', fullscreenButton);

    const freezeFromTimeButton = document.getElementById('freezeFromTime'); console.log('freezeFromTimeButton:', freezeFromTimeButton);
    const freezeToTimeButton = document.getElementById('freezeToTime'); console.log('freezeToTimeButton:', freezeToTimeButton);
    const currentTimeFromSpan = document.getElementById('currentTimeFrom'); console.log('currentTimeFromSpan:', currentTimeFromSpan);
    const currentTimeToSpan = document.getElementById('currentTimeTo'); console.log('currentTimeToSpan:', currentTimeToSpan);
    const videoSourceDisplay = document.getElementById('videoSourceDisplay'); console.log('videoSourceDisplay:', videoSourceDisplay);
    const currentVideoPathSpan = document.getElementById('currentVideoPath'); console.log('currentVideoPathSpan:', currentVideoPathSpan);
    const videoLoadMessageSpan = document.getElementById('videoLoadMessage'); console.log('videoLoadMessageSpan:', videoLoadMessageSpan);
    const eventEntryFormContainer = document.getElementById('eventEntryFormContainer'); console.log('eventEntryFormContainer:', eventEntryFormContainer);
    const channelSelect = document.getElementById('channelSelect'); console.log('channelSelect:', channelSelect);
    const fromTimeInput = document.getElementById('fromTimeInput'); console.log('fromTimeInput:', fromTimeInput);
    const toTimeInput = document.getElementById('toTimeInput'); console.log('toTimeInput:', toTimeInput);
    const dynamicAttributesDiv = document.getElementById('dynamicAttributes'); console.log('dynamicAttributesDiv:', dynamicAttributesDiv);
    const eventForm = document.getElementById('eventForm'); console.log('eventForm:', eventForm);
    const eventTableBody = document.querySelector('#eventTable tbody'); console.log('eventTableBody:', eventTableBody);
    const exportTejButton = document.getElementById('exportTej'); console.log('exportTejButton:', exportTejButton);

    // --- State Variables ---
    let channelsConfig = []; // To store data from channels.json
    let currentFromTime = -1; // milliseconds
    let currentToTime = -1;   // milliseconds
    let primaryVideoSource = null; // The URL of the loaded video
    let primaryVideoFileName = null; // For display/export, might just be the URL
    let savedEvents = []; // Array to hold all sensory events loaded/created
    let editingEventId = null; // Stores the ID of the event being edited

    // --- IndexedDB Constants ---
    const DB_NAME = 'tejEditorDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'sensoryEvents'; // Stores individual sensory events
    const METADATA_STORE_NAME = 'tejMetadata'; // Stores primary video source etc.

    // --- IndexedDB Setup & Operations ---
    function openDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
                    db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'key' });
                }
            };

            request.onsuccess = function(event) {
                resolve(event.target.result);
            };

            request.onerror = function(event) {
                console.error("IndexedDB error:", event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    async function saveEventToDb(eventData) {
        const db = await openDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.put(eventData); // Use put for both add and update
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function deleteEventFromDb(id) {
        const db = await openDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function getAllEventsFromDb() {
        const db = await openDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function clearAllEventsInDb() {
        const db = await openDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function saveMetadataToDb(key, value) {
        const db = await openDb();
        const tx = db.transaction(METADATA_STORE_NAME, 'readwrite');
        const store = tx.objectStore(METADATA_STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function getMetadataFromDb(key) {
        const db = await openDb();
        const tx = db.transaction(METADATA_STORE_NAME, 'readonly');
        const store = tx.objectStore(METADATA_STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    }

    async function clearMetadataInDb() {
        const db = await openDb();
        const tx = db.transaction(METADATA_STORE_NAME, 'readwrite');
        const store = tx.objectStore(METADATA_STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // --- Helper Functions ---

    // Formats milliseconds into MM:SS.mmm
    function formatTime(milliseconds) {
        if (isNaN(milliseconds) || milliseconds < 0) return "00:00.000";
        const totalSeconds = Math.floor(milliseconds / 1000);
        const ms = milliseconds % 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    // Updates the time display spans next to freeze buttons
    function updateCurrentTimeDisplays() {
        const currentTimeMs = Math.floor(videoPlayer.currentTime * 1000);
        currentTimeFromSpan.textContent = formatTime(currentTimeMs);
        currentTimeToSpan.textContent = formatTime(currentTimeMs);
    }

    // Renders dynamic form fields based on selected channel from channels.json
    function renderDynamicFormFields(selectedChannelId, initialAttributes = {}) {
        dynamicAttributesDiv.innerHTML = ''; // Clear previous fields
        const channel = channelsConfig.find(c => c.id === selectedChannelId);

        if (!channel) return;

        channel.attributes.forEach(attr => {
            const formGroup = document.createElement('div');
            formGroup.classList.add('form-group');

            const label = document.createElement('label');
            label.setAttribute('for', `attr-${attr.name}`);
            label.textContent = `${attr.label}:`;
            if (attr.required) {
                label.innerHTML += ' <span style="color: red;">*</span>';
            }
            formGroup.appendChild(label);

            let inputElement;
            const initialValue = initialAttributes[attr.name] !== undefined ? initialAttributes[attr.name] : attr.default;

            switch (attr.type) {
                case 'text':
                case 'number':
                case 'range':
                    inputElement = document.createElement('input');
                    inputElement.type = attr.type;
                    if (attr.placeholder) inputElement.placeholder = attr.placeholder;
                    if (attr.min !== undefined) inputElement.min = attr.min;
                    if (attr.max !== undefined) inputElement.max = attr.max;
                    if (attr.step !== undefined) inputElement.step = attr.step;
                    if (initialValue !== undefined) inputElement.value = initialValue;
                    break;
                case 'select':
                    inputElement = document.createElement('select');
                    attr.options.forEach(optionText => {
                        const option = document.createElement('option');
                        option.value = optionText;
                        option.textContent = optionText;
                        inputElement.appendChild(option);
                    });
                    if (initialValue !== undefined) inputElement.value = initialValue;
                    break;
                case 'textarea':
                    inputElement = document.createElement('textarea');
                    if (attr.placeholder) inputElement.placeholder = attr.placeholder;
                    if (initialValue !== undefined) inputElement.value = initialValue;
                    break;
            }
            inputElement.id = `attr-${attr.name}`;
            inputElement.name = attr.name; // Use name for form submission
            inputElement.required = attr.required;

            formGroup.appendChild(inputElement);
            dynamicAttributesDiv.appendChild(formGroup);
        });
    }

    // Displays all saved events in the table
    function displayEvents() {
        eventTableBody.innerHTML = ''; // Clear existing rows
        savedEvents.sort((a, b) => a.from - b.from); // Sort by time for better readability
        savedEvents.forEach(event => {
            const row = eventTableBody.insertRow();
            row.dataset.id = event.id; // Store IndexedDB ID for editing/deleting

            row.insertCell().textContent = channelsConfig.find(c => c.id === event.channelId)?.name || event.channelId;
            row.insertCell().textContent = formatTime(event.from);
            row.insertCell().textContent = formatTime(event.to);

            const attributesCell = row.insertCell();
            const attributesList = document.createElement('ul');
            attributesList.style.paddingLeft = '20px'; // Basic styling for readability
            attributesList.style.margin = '0';
            for (const key in event.attributes) {
                const listItem = document.createElement('li');
                listItem.textContent = `${key}: ${event.attributes[key]}`;
                attributesList.appendChild(listItem);
            }
            attributesCell.appendChild(attributesList);

            const actionsCell = row.insertCell();
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => editEvent(event.id));
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.style.backgroundColor = '#dc3545'; // Red for delete
            deleteButton.style.borderColor = '#dc3545';
            deleteButton.addEventListener('click', () => deleteEvent(event.id));
            actionsCell.appendChild(deleteButton);
        });
    }

    // Loads event data into the form for editing
    function editEvent(id) {
        const eventToEdit = savedEvents.find(e => e.id === id);
        if (!eventToEdit) {
            alert("Event not found for editing.");
            return;
        }

        editingEventId = id; // Set the ID of the event being edited

        // Populate basic time fields
        currentFromTime = eventToEdit.from;
        currentToTime = eventToEdit.to;
        fromTimeInput.value = currentFromTime;
        toTimeInput.value = currentToTime;

        // Select the channel in the dropdown
        channelSelect.value = eventToEdit.channelId;
        // Render dynamic fields with existing attribute values
        renderDynamicFormFields(eventToEdit.channelId, eventToEdit.attributes);

        eventEntryFormContainer.style.display = 'block'; // Show the form
        eventForm.querySelector('button[type="submit"]').textContent = 'Update Event'; // Change button text
    }

    // Deletes an event from savedEvents and IndexedDB
    async function deleteEvent(id) {
        if (!confirm("Are you sure you want to delete this event?")) {
            return;
        }
        await deleteEventFromDb(id);
        savedEvents = savedEvents.filter(event => event.id !== id);
        displayEvents();
        alert("Event deleted successfully!");
    }

    // --- Main Initialization Function ---
    async function loadEditorState() {
        savedEvents = await getAllEventsFromDb();
        displayEvents();

        // Load primary video source
        primaryVideoSource = await getMetadataFromDb('primaryVideoSource');
        primaryVideoFileName = await getMetadataFromDb('primaryVideoFileName'); // Load file name (relative path)
        if (primaryVideoSource) {
            videoPlayer.src = primaryVideoSource;
            videoPlayer.load();
            // Display the saved primaryVideoFileName (the relative path)
            updateVideoSourceDisplay(primaryVideoFileName || primaryVideoSource);
            videoLoadMessageSpan.textContent = "Video loaded from previous session.";
        } else {
            updateVideoSourceDisplay(null);
            videoLoadMessageSpan.textContent = '';
        }
    }

    // Updates the video path display UI element
    function updateVideoSourceDisplay(path) {
        if (path) {
            currentVideoPathSpan.textContent = path;
        } else {
            currentVideoPathSpan.textContent = 'No video loaded.';
        }
        videoSourceDisplay.style.display = 'block'; // Ensure it's always visible
    }

    // --- Event Listeners ---

    // Load channels config from JSON then initialize editor state
    fetch('channels.json')
        .then(response => response.json())
        .then(data => {
            channelsConfig = data;
            data.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                channelSelect.appendChild(option);
            });
            loadEditorState(); // Load existing data after config is ready
        })
        .catch(error => console.error('Error loading channels.json:', error));


    // Event listener for the "Load Video from URL" button
    loadVideoUrlButton.addEventListener('click', async () => {
        const videoUrl = videoUrlInput.value.trim();

        if (!videoUrl) {
            alert("Please enter a video URL.");
            return;
        }

        // Basic URL validation
        try {
            new URL(videoUrl); // Check if it's a valid URL format
        } catch (_) {
            alert("Please enter a valid URL (e.g., http://example.com/video.mp4).");
            return;
        }

        // Clear previous video source and associated .tej data (assuming new project for new video)
        await clearAllEventsInDb();
        await clearMetadataInDb();
        savedEvents = [];
        displayEvents(); // Clear table

        primaryVideoSource = videoUrl; // This is the absolute URL for playback
        // For the .tej export, we want the relative path (filename part of the URL)
        primaryVideoFileName = videoUrl.split('/').pop().split('?')[0]; // Get filename from URL, remove query string

        videoPlayer.src = videoUrl;
        videoPlayer.load(); // Load video to update duration etc.
        videoPlayer.playbackRate = 1; // Reset playback rate for consistency

        await saveMetadataToDb('primaryVideoSource', videoUrl);
        await saveMetadataToDb('primaryVideoFileName', primaryVideoFileName); // Save the relative path for export
        updateVideoSourceDisplay(primaryVideoFileName); // Display the relative path to the user
        videoLoadMessageSpan.textContent = "Video loaded from URL.";
        alert("Video loaded successfully!");
    });


    // Event listener for the "Upload .tej File" button (remains for .tej only)
    uploadTejButton.addEventListener('click', () => {
        uploadTejFile.click(); // Trigger hidden .tej file input
    });

    // Event listener for the hidden .tej file input
    uploadTejFile.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.name.endsWith('.tej')) {
            // Clear current state first
            await clearAllEventsInDb();
            await clearMetadataInDb();
            savedEvents = [];
            displayEvents(); // Clear table
            primaryVideoSource = null;
            primaryVideoFileName = null;
            videoPlayer.removeAttribute('src');
            videoPlayer.load();
            updateVideoSourceDisplay(null);
            videoLoadMessageSpan.textContent = '';

            videoLoadMessageSpan.textContent = "Parsing .tej files is the next major implementation step. Currently, this will not load .tej data fully.";
            alert("Feature Incomplete: .tej file parsing. Please load the video from URL separately if you want to test the editor with a video, then manually add events.");

            // TODO: Implement the actual binary parsing of the .tej file here
            // This would involve reading primary_video_source from the header
            // and then loading all associated sensory events.
            // If the primary_video_source found in the .tej file is a local path or another URL, you'd load it.
            // (The `primary_video_source` in the .tej file should be the relative path, e.g., "my_video.mp4")
            // Example of how you would *use* the parsed primary_video_source:
            // const parsedVideoRelativePath = "my_video_from_tej.mp4"; // This would come from parsing the .tej header
            // const fullVideoUrlForPlayback = "http://example.com/videos/" + parsedVideoRelativePath; // Or user provides base URL
            // primaryVideoSource = fullVideoUrlForPlayback;
            // primaryVideoFileName = parsedVideoRelativePath;
            // videoPlayer.src = primaryVideoSource;
            // videoPlayer.load();
            // updateVideoSourceDisplay(primaryVideoFileName);
            // await saveMetadataToDb('primaryVideoSource', primaryVideoSource);
            // await saveMetadataToDb('primaryVideoFileName', primaryVideoFileName);

        } else {
            alert("Please upload a .tej file.");
        }
    });


    videoPlayer.addEventListener('timeupdate', updateCurrentTimeDisplays);

    // NEW Fullscreen Toggle Event Listener
    fullscreenButton.addEventListener('click', () => {
        if (!primaryVideoSource) {
            alert("Please load a video first to go fullscreen.");
            return;
        }

        if (document.fullscreenElement) {
            // If already in fullscreen, exit
            document.exitFullscreen();
        } else {
            // If not in fullscreen, request fullscreen for the video player
            if (videoPlayer.requestFullscreen) {
                videoPlayer.requestFullscreen();
            } else if (videoPlayer.mozRequestFullScreen) { // Firefox
                videoPlayer.mozRequestFullScreen();
            } else if (videoPlayer.webkitRequestFullscreen) { // Chrome, Safari and Opera
                videoPlayer.webkitRequestFullscreen();
            } else if (videoPlayer.msRequestFullscreen) { // IE/Edge
                videoPlayer.msRequestFullscreen();
            }
        }
    });


    freezeFromTimeButton.addEventListener('click', () => {
        if (!primaryVideoSource) {
            alert("Please load a video first to freeze time.");
            return;
        }
        currentFromTime = Math.floor(videoPlayer.currentTime * 1000);
        fromTimeInput.value = currentFromTime;
        eventEntryFormContainer.style.display = 'block';
        eventForm.querySelector('button[type="submit"]').textContent = 'Add Event';
        editingEventId = null;
        channelSelect.value = '';
        renderDynamicFormFields('');
    });

    freezeToTimeButton.addEventListener('click', () => {
        if (!primaryVideoSource) {
            alert("Please load a video first to freeze time.");
            return;
        }
        currentToTime = Math.floor(videoPlayer.currentTime * 1000);
        if (currentFromTime === -1) {
            alert("Error: Please freeze 'From Time' first.");
            currentToTime = -1;
            toTimeInput.value = '';
            return;
        }
        if (currentToTime <= currentFromTime) {
            alert("Error: 'To Time' (" + formatTime(currentToTime) + ") must be greater than 'From Time' (" + formatTime(currentFromTime) + "). Please re-freeze 'To Time'.");
            currentToTime = -1;
            toTimeInput.value = '';
            return;
        }
        toTimeInput.value = currentToTime;
    });

    channelSelect.addEventListener('change', (event) => {
        const selectedChannelId = event.target.value;
        renderDynamicFormFields(selectedChannelId);
    });

    eventForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (currentFromTime === -1 || currentToTime === -1 || currentToTime <= currentFromTime) {
            alert("Please freeze valid 'From Time' and 'To Time' first.");
            return;
        }
        if (!primaryVideoSource) {
             alert("No video loaded to associate events with. Please load a video first.");
             return;
        }

        const channelId = channelSelect.value;
        if (!channelId) {
            alert("Please select a channel.");
            return;
        }

        const newEvent = {
            channelId: channelId,
            from: currentFromTime,
            to: currentToTime,
            attributes: {}
        };

        const currentChannelConfig = channelsConfig.find(c => c.id === channelId);
        if (currentChannelConfig) {
            let isValid = true;
            currentChannelConfig.attributes.forEach(attr => {
                const inputElement = document.getElementById(`attr-${attr.name}`);
                if (inputElement) {
                    let value;
                    if (attr.type === 'number' || attr.type === 'range') {
                        value = parseFloat(inputElement.value);
                        if (isNaN(value) && attr.required) {
                            alert(`Please enter a valid number for ${attr.label}.`);
                            isValid = false;
                            return;
                        }
                    } else {
                        value = inputElement.value;
                        if (attr.required && (!value || typeof value !== 'string' || !value.trim())) {
                            alert(`Please enter a value for ${attr.label}.`);
                            isValid = false;
                            return;
                        }
                    }
                    newEvent.attributes[attr.name] = value;
                }
            });
            if (!isValid) return;
        }

        if (editingEventId) {
            newEvent.id = editingEventId;
            await saveEventToDb(newEvent);
            const index = savedEvents.findIndex(e => e.id === editingEventId);
            if (index > -1) {
                savedEvents[index] = newEvent;
            }
            alert("Event updated successfully!");
        } else {
            const savedId = await saveEventToDb(newEvent);
            newEvent.id = savedId;
            savedEvents.push(newEvent);
            alert("Event added successfully!");
        }

        displayEvents();
        eventForm.reset();
        currentFromTime = -1;
        currentToTime = -1;
        fromTimeInput.value = '';
        toTimeInput.value = '';
        dynamicAttributesDiv.innerHTML = '';
        channelSelect.value = '';
        eventEntryFormContainer.style.display = 'none';
        editingEventId = null;
        eventForm.querySelector('button[type="submit"]').textContent = 'Add Event';
    });

    // --- .tej Binary Export Logic ---
    // TextEncoder instance for UTF-8 encoding
    const encoder = new TextEncoder();

    // Helper to convert number to 4-byte Uint32 ArrayBuffer
    const toUint32Buffer = (num) => {
        const arr = new Uint32Array(1);
        arr[0] = num;
        return arr.buffer;
    };

    // Helper to convert string to length-prefixed Uint8Array (string length + string bytes)
    const toLengthPrefixedUTF8 = (str) => {
        // Trim whitespace to ensure accurate length calculation for strings
        const trimmedStr = String(str).trim(); // Ensure it's a string and trim
        const encoded = encoder.encode(trimmedStr);
        // Using Uint32 for length to match format (4 bytes for length)
        const lengthBuffer = toUint32Buffer(encoded.length);
        return new Uint8Array([...new Uint8Array(lengthBuffer), ...encoded]);
    };

    exportTejButton.addEventListener('click', async () => {
        if (!primaryVideoSource) {
            alert("Please load a primary video source first before exporting.");
            return;
        }
        if (savedEvents.length === 0) {
            alert("No sensory events to export. Add some events first.");
            return;
        }

        console.log("Starting .tej export...");

        const chunks = []; // Array to hold all binary chunks (each element is Uint8Array)

        // --- 1. TEJ_HEADER Chunk ---
        // Header attributes
        const headerAttributes = {
            version: "1.0",
            total_duration: videoPlayer.duration ? Math.floor(videoPlayer.duration * 1000) : 0,
            primary_video_source: primaryVideoFileName || "linked_video_placeholder" // Use primaryVideoFileName (relative path)
        };

        const headerAttributeBuffers = [];
        for (const [key, val] of Object.entries(headerAttributes)) {
            // Key is length-prefixed string
            const keyBuffer = toLengthPrefixedUTF8(key.trim());
            headerAttributeBuffers.push(keyBuffer);

            if (typeof val === 'string') {
                // Value is length-prefixed string
                const valBuffer = toLengthPrefixedUTF8(val.trim());
                headerAttributeBuffers.push(valBuffer);
            } else if (typeof val === 'number') {
                const numberBuffer = new Float32Array([val]).buffer; // 4-byte float data
                const lengthBuffer = toUint32Buffer(numberBuffer.byteLength); // 4-byte length (always 4 for float32)
                // Combine length and data into a single Uint8Array for the value
                headerAttributeBuffers.push(new Uint8Array([...new Uint8Array(lengthBuffer), ...new Uint8Array(numberBuffer)]));
            }
        }

        const headerValue = new Uint8Array(headerAttributeBuffers.flatMap(arr => Array.from(arr)));
        const headerType = encoder.encode("TEJH"); // Fixed 4-byte string for header type
        const headerLength = new Uint8Array(toUint32Buffer(headerValue.length)); // 4-byte length of header value

        chunks.push(headerType, headerLength, headerValue);


        // --- 2. CHANNEL Container Chunks ---
        // Group events by channelId first
        const eventsByChannel = savedEvents.reduce((acc, event) => {
            if (!acc[event.channelId]) {
                acc[event.channelId] = [];
            }
            acc[event.channelId].push(event);
            return acc;
        }, {});

        for (const channelId in eventsByChannel) {
            const channelEvents = eventsByChannel[channelId];
            const channelConfig = channelsConfig.find(c => c.id === channelId.trim()); // Ensure trimmed ID
            if (!channelConfig) {
                console.warn(`Channel config not found for ID: ${channelId}. Skipping this channel's events.`);
                continue;
            }

            const channelEventsBuffer = []; // To hold all event chunks for this channel

            for (const event of channelEvents) {
                // --- EVENT Chunk (e.g., SMELL, TEMPERATURE) ---
                const eventAttributeBuffers = [];

                // Standard attributes (timefrom, timeto) - handled as Uint32 numbers
                eventAttributeBuffers.push(toLengthPrefixedUTF8("timefrom"));
                const fromTimeNumBuffer = toUint32Buffer(event.from);
                eventAttributeBuffers.push(new Uint8Array([...new Uint8Array(toUint32Buffer(fromTimeNumBuffer.byteLength)), ...new Uint8Array(fromTimeNumBuffer)]));

                eventAttributeBuffers.push(toLengthPrefixedUTF8("timeto"));
                const toTimeNumBuffer = toUint32Buffer(event.to);
                eventAttributeBuffers.push(new Uint8Array([...new Uint8Array(toUint32Buffer(toTimeNumBuffer.byteLength)), ...new Uint8Array(toTimeNumBuffer)]));

                // Dynamic attributes from channel.json
                for (const attrName in event.attributes) {
                    const attrValue = event.attributes[attrName];
                    // Ensure attrName is trimmed
                    eventAttributeBuffers.push(toLengthPrefixedUTF8(attrName.trim())); // Attribute Key

                    if (typeof attrValue === 'string') {
                        // Ensure attrValue is trimmed
                        eventAttributeBuffers.push(toLengthPrefixedUTF8(attrValue.trim())); // Value is length-prefixed string
                    } else if (typeof attrValue === 'number') {
                        const numberBuffer = new Float32Array([attrValue]).buffer; // 4-byte float for attributes
                        const lengthBuffer = toUint32Buffer(numberBuffer.byteLength); // Length of the number buffer (4 bytes)
                        // Push a single Uint8Array for number value
                        eventAttributeBuffers.push(new Uint8Array([...new Uint8Array(lengthBuffer), ...new Uint8Array(numberBuffer)]));
                    }
                    // TODO: Handle boolean, and other potential types if needed (e.g., if channels.json defines 'boolean')
                }

                // Concatenate all attribute buffers for this event into a single Uint8Array
                const eventValue = new Uint8Array(eventAttributeBuffers.flatMap(arr => Array.from(arr)));
                // Use the first 4 characters of the channelId for the event type (e.g., "smell" -> "SMEL")
                const eventType = encoder.encode(channelConfig.id.substring(0, 4).toUpperCase());
                const eventLength = new Uint8Array(toUint32Buffer(eventValue.length)); // 4-byte length of eventValue
                channelEventsBuffer.push(eventType, eventLength, eventValue);
            }

            // --- CHANNEL Chunk ---
            // The channel's own name is the first part of its value
            const channelNameBuffer = toLengthPrefixedUTF8(channelConfig.id.trim()); // Storing the channel ID as its name (length-prefixed string)
            // Concatenate channel name and all its events into the channelValue
            const channelValue = new Uint8Array([...Array.from(channelNameBuffer), ...channelEventsBuffer.flatMap(arr => Array.from(arr))]);

            const channelType = encoder.encode("CHAN"); // Fixed 4-byte string for channel type
            const channelLength = new Uint8Array(toUint32Buffer(channelValue.length));
            chunks.push(channelType, channelLength, channelValue);
        }

        // Concatenate all main chunks into a single ArrayBuffer for the final .tej file
        const finalBuffer = new Uint8Array(chunks.flatMap(arr => Array.from(arr)));
        const blob = new Blob([finalBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'exported.tej';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up the blob URL
        alert("Exported exported.tej!");
        console.log("Exported .tej file size:", finalBuffer.byteLength, "bytes");
    });
}); // End DOMContentLoaded