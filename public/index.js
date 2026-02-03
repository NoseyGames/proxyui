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
 * Helper to format URL (In case search.js is missing)
 */
function formatUrl(input, engine) {
    try {
        return new URL(input).toString();
    } catch (e) {
        if (input.includes(".") && !input.includes(" ")) return "https://" + input;
        return engine.replace("%s", encodeURIComponent(input));
    }
}

async function launchProxy(inputUrl) {
    try {
        await registerSW();
    } catch (err) {
        if (error) error.textContent = "Failed to register service worker.";
        if (errorCode) errorCode.textContent = err.toString();
        return; 
    }

    const url = formatUrl(inputUrl, searchEngine.value);

    // Setup Wisp Transport
    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    if (connection && (await connection.getTransport()) !== "/libcurl/index.mjs") {
        await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
    }

    if (!window.activeFrame) {
        const newFrame = scramjet.createFrame();
        newFrame.frame.id = "sj-frame";
        newFrame.frame.style.position = "fixed";
        newFrame.frame.style.inset = "0";
        newFrame.frame.style.width = "100%";
        newFrame.frame.style.height = "100%";
        newFrame.frame.style.border = "none";
        newFrame.frame.style.zIndex = "999";
        newFrame.frame.style.display = "block";

        document.body.appendChild(newFrame.frame);
        window.activeFrame = newFrame;

        // Hide UI elements
        if (uiWrapper) uiWrapper.style.display = "none";
        document.getElementById("constellation-canvas").style.display = "none";
        
        newFrame.go(url);
    } else {
        window.activeFrame.go(url);
    }
}

// Main Search Listener
if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        launchProxy(address.value);
    });
}

// Top Bar Listener
if (topForm) {
    topForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (topAddress.value.trim() !== "") {
            launchProxy(topAddress.value);
            topAddress.value = ""; 
        }
    });
}
