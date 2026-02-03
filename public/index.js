"use strict";

const form = document.getElementById("sj-form");
const topForm = document.getElementById("top-form");
const address = document.getElementById("sj-address");
const topAddress = document.getElementById("top-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const uiWrapper = document.getElementById("main-ui");

// --- SCRAMJET INIT ---
const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});
scramjet.init();

// --- BAREMUX INIT ---
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

/**
 * Main Function to Launch the Proxy
 */
async function launchProxy(inputUrl) {
    try {
        await registerSW();
    } catch (err) {
        error.textContent = "Failed to register service worker.";
        errorCode.textContent = err.toString();
        throw err;
    }

    const url = search(inputUrl, searchEngine.value);

    // Setup Wisp Transport
    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
        await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
    }

    // Handle Frame Creation/Selection
    let frameObj = document.getElementById("sj-frame");
    
    if (!frameObj) {
        const newFrame = scramjet.createFrame();
        newFrame.frame.id = "sj-frame";
        document.body.appendChild(newFrame.frame);
        frameObj = newFrame;
    } else {
        // If frame already exists, we use the scramjet instance to navigate
        // Note: For existing frames, you may need to track the 'frame' object returned by createFrame
        window.activeFrame.go(url); 
        return;
    }

    // Hide UI and Show Frame
    uiWrapper.classList.add("ui-hidden");
    document.querySelector(".grid-bg").classList.add("ui-hidden");
    frameObj.frame.style.display = "block";
    
    // Store reference globally to allow navigation from top-bar later
    window.activeFrame = frameObj; 
    frameObj.go(url);
}

// Main Search Listener
form.addEventListener("submit", (e) => {
    e.preventDefault();
    launchProxy(address.value);
});

// Top Bar Listener
topForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (topAddress.value.trim() !== "") {
        launchProxy(topAddress.value);
        topAddress.value = ""; // Clear input
    }
});
