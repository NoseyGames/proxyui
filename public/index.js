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
        if (error) error.textContent = "Failed to register service worker.";
        if (errorCode) errorCode.textContent = err.toString();
        throw err;
    }

    const url = search(inputUrl, searchEngine.value);

    // Setup Wisp Transport
    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    if (connection && (await connection.getTransport()) !== "/libcurl/index.mjs") {
        await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
    }

    // Handle Frame Creation/Selection
    let frameElement = document.getElementById("sj-frame");
    
    if (!window.activeFrame) {
        // First launch: create the frame object using Scramjet
        const newFrame = scramjet.createFrame();
        newFrame.frame.id = "sj-frame";
        
        // Replace existing placeholder or append
        if (frameElement) {
            frameElement.replaceWith(newFrame.frame);
        } else {
            document.body.appendChild(newFrame.frame);
        }

        window.activeFrame = newFrame; // Define globally so subsequent calls work
        
        // UI Transitions
        uiWrapper.classList.add("ui-hidden");
        document.querySelector(".space-bg")?.classList.add("ui-hidden");
        newFrame.frame.style.display = "block";
        
        newFrame.go(url);
    } else {
        // Re-using existing frame
        window.activeFrame.go(url);
    }
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
        topAddress.value = ""; 
    }
});
