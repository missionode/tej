.TEJ Editor
Introduction
This repository contains the .TEJ Editor, a web-based application designed to create and edit .tej files. The .tej format is an innovative multimedia container that extends traditional audio and video to include synchronized sensory channels such as smell, pleasure, temperature, touch, and taste. It acts as a wrapper around existing video formats, allowing you to link external video files and overlay rich sensory data onto their timelines.

The editor provides a user-friendly interface to define and synchronize these additional sensory experiences, making multimedia truly immersive.

Features
Load Video from URL: Easily load any video (e.g., MP4, WebM) by providing its URL directly into the editor for playback and synchronization.

Time Freezing: Capture precise "From" and "To" timestamps from the video player to define the duration of your sensory events.

Dynamic Channel Forms: After freezing a time range, a dynamic form appears, adapting its input fields based on the selected sensory channel (Smell, Pleasure, Temperature, Touch, Taste, etc.). This is powered by a flexible channels.json configuration.

Event Management:

Add Events: Submit filled forms to add new sensory events to your .tej timeline.

Edit Events: Modify existing events directly from the displayed table.

Delete Events: Remove unwanted sensory events.

Persistent Local Storage: All added and edited sensory events are automatically saved in your browser's IndexedDB, allowing you to close and reopen the editor without losing your work.

Export to .tej: Generate a binary .tej file containing all your defined sensory data, linked to your specified video source.

Upload .tej (Partial): The editor has a button to upload existing .tej files. Currently, this primarily initializes the editor for a new project, but the full binary parsing of .tej data (to automatically load events and video links) is a planned future enhancement.

How to Use
Open the Editor: Open the index.html file in your web browser.

Load a Video:

In the "Load Video Source from URL" section, enter the URL of an .mp4, .webm, or other common video file.

Click the "Load Video from URL" button. The video will appear in the player, and its URL will be displayed below.

Freeze Timestamps:

Play the video to the desired start time for a sensory event.

Click "Freeze FROM TIME". The current video time will be displayed and captured.

Play the video to the desired end time for the event.

Click "Freeze TO TIME". The time will be captured. (Validation will ensure "To Time" is after "From Time").

Add Sensory Event Data:

Once both "From Time" and "To Time" are frozen, the "Add New Sensory Event" form will appear.

Select a Channel: Choose the sensory channel (e.g., "Smell", "Temperature") from the dropdown.

Fill Attributes: Dynamic input fields will appear based on your channel selection (e.g., "Smell Type", "Intensity"). Fill in the required details.

Click "Add Event" to save the event to your local session.

Manage Saved Events:

All your added events will appear in the "Saved Sensory Events" table below the form.

Use the "Edit" button next to an event to load its data back into the form for modification. Click "Update Event" (the submit button's text will change) to save your changes.

Use the "Delete" button to remove an event.

Export Your .tej File:

Once you're satisfied with all your sensory events, click the "Export .tej File" button at the bottom of the page.

A binary .tej file (e.g., exported.tej) will be downloaded to your computer, containing all your defined sensory data and a reference to the video you loaded.

Upload .tej File (Limited Functionality):

Click "Upload .tej File". Currently, this primarily clears the current session. The full automated loading of video and events from an uploaded .tej file is a future feature. You will need to re-load the video manually via URL after uploading a .tej for now.

.TEJ Format Overview
The .tej file format is a binary container designed for extensibility and human-readability (via parsing tools). It utilizes an HTML-like semantic tag structure internally, represented as a series of Type-Length-Value (TLV) chunks.

Wrapper Concept: A .tej file does not embed the raw audio/video data. Instead, it stores a reference (a URL or path) to an external video file. This keeps the .tej files small and leverage existing video codecs.

Semantic Structure: Sensory events are stored using semantic "tags" like <smell>, <temperature>, <pleasure>. Each "tag" has attributes (e.g., timefrom, timeto, type, intensity) that define the specific sensory experience.

Scalability: The TLV chunking allows for easy addition of new sensory channels and attributes in the future without breaking compatibility with older parsers (unrecognized chunks/attributes can be skipped).

Channel Configuration (channels.json)
The editor's dynamic forms are driven by the channels.json file. This JSON array defines the available sensory channels and their respective attributes (input type, labels, requirements, default values, options).

To add a new channel or modify an existing one:

Open channels.json in a text editor.

Add a new JSON object to the array for a new channel, or modify an existing one.

Define the id, name, description, and a list of attributes.

Each attribute requires a name (for the .tej format), label (for the UI), and type (e.g., text, number, range, select, textarea).

Save the channels.json file. The editor will automatically pick up changes on refresh.

This design makes the editor highly adaptable to new sensory modalities.

Future Improvements / Known Limitations
Full .tej File Parsing (Import): The most significant outstanding feature is the complete binary parsing of an uploaded .tej file. This would involve reading the binary structure, extracting the linked video source, and populating the sensory events table automatically. Currently, you need to load the video from a URL separately after uploading a .tej file.

Local File References: The editor currently relies on browser blob: URLs for local video files, which are temporary. For robust persistence, a more sophisticated solution for managing local file paths (e.g., prompting the user to re-select on load, or relying on pre-configured relative paths) would be needed. This version primarily supports URL-based video loading for ease of use.

Advanced Binary Type Handling: The .tej export currently handles strings and numbers. More complex data types (booleans, arrays, nested objects) for attributes would require specific binary encoding definitions.

User Feedback & Error Handling: Enhancements to inline validation, more detailed success/error messages, and loading indicators could improve the user experience.

Running Locally
To run the .TEJ Editor locally:

Clone the Repository:

git clone <repository-url>
cd tej-editor

Files: Ensure you have the following files in the same directory:

index.html

style.css

script.js

channels.json

Open in Browser: Simply open the index.html file in your web browser. Most modern browsers will allow this without a local server.

Alternatively, for better practice and if you encounter issues with file:// protocols, you can use a simple local web server (e.g., Python's http.server):

# In the project directory
python -m http.server 8000

Then, open your browser and navigate to http://localhost:8000.