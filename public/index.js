"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const uiWrapper = document.getElementById("main-ui");
const navUrlInput = document.getElementById("nav-url");
const tabBar = document.getElementById("tab-bar");

let tabs = [];
let activeTabId = null;

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

// --- BAREMUX INIT (Fixed with 'false' to bypass SharedWorker timeout) ---
const connection = new BareMux.BareMuxConnection("/baremux/worker.js", false);

function formatUrl(input, engine) {
    try {
        return new URL(input).toString();
    } catch (e) {
        if (input.includes(".") && !input.includes(" ")) return "https://" + input;
        return engine.replace("%s", encodeURIComponent(input));
    }
}

async function launchProxy(inputUrl) {
    if (!inputUrl) return;

    try {
        await registerSW();
    } catch (err) {
        if (error) error.textContent = "Failed to register service worker.";
        return; 
    }

    const url = formatUrl(inputUrl, searchEngine.value);

    // Setup Wisp Transport
    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    try {
        if (connection && (await connection.getTransport()) !== "/libcurl/index.mjs") {
            await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
        }
    } catch (e) {
        console.error("Transport error:", e);
    }

    // Tab & Frame Creation
    const id = 'tab-' + Date.now();
    const newFrame = scramjet.createFrame();
    
    newFrame.frame.id = 'frame-' + id;
    newFrame.frame.classList.add('proxy-frame');
    // Ensure the frame is styled to show up correctly below the nav
    Object.assign(newFrame.frame.style, {
        position: "fixed",
        inset: "85px 0 0 0",
        width: "100%",
        height: "calc(100% - 85px)",
        border: "none",
        zIndex: "50",
        display: "none"
    });

    document.body.appendChild(newFrame.frame);
    
    const tabObj = { id, url, frame: newFrame };
    tabs.push(tabObj);
    
    switchTab(id);
    newFrame.go(url);

    // UI Cleanup
    if (uiWrapper) uiWrapper.style.display = "none";
    const canvas = document.getElementById("constellation-canvas");
    if (canvas) canvas.style.display = "none";
}

function switchTab(id) {
    activeTabId = id;
    // Hide all frames
    document.querySelectorAll('.proxy-frame').forEach(f => f.style.display = 'none');
    
    const activeTab = tabs.find(t => t.id === id);
    if (activeTab) {
        const frameEl = document.getElementById('frame-' + id);
        if (frameEl) frameEl.style.display = 'block';
        if (navUrlInput) navUrlInput.value = activeTab.url;
    }
    renderTabs();
}

function renderTabs() {
    if (!tabBar) return;
    tabBar.innerHTML = "";
    tabs.forEach(t => {
        const div = document.createElement("div");
        div.className = `tab ${t.id === activeTabId ? 'active' : ''}`;
        div.innerHTML = `<span>Page</span> <span class="tab-close" onclick="closeTab(event, '${t.id}')">×</span>`;
        div.onclick = () => switchTab(t.id);
        tabBar.appendChild(div);
    });
}

window.closeTab = function(e, id) {
    e.stopPropagation();
    tabs = tabs.filter(t => t.id !== id);
    const frame = document.getElementById('frame-' + id);
    if (frame) frame.remove();

    if (tabs.length === 0) {
        if (uiWrapper) uiWrapper.style.display = "flex";
        const canvas = document.getElementById("constellation-canvas");
        if (canvas) canvas.style.display = "block";
        activeTabId = null;
    } else if (activeTabId === id) {
        switchTab(tabs[tabs.length - 1].id);
    }
    renderTabs();
};

window.controlFrame = function(action) {
    const current = tabs.find(t => t.id === activeTabId);
    if (!current) return;
    if (action === 'back') current.frame.goBack();
    if (action === 'forward') current.frame.goForward();
    if (action === 'reload') current.frame.reload();
};

window.addTab = function() {
    if (uiWrapper) uiWrapper.style.display = "flex";
    address.focus();
};

// Event Listeners
if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        launchProxy(address.value);
    });
}

if (navUrlInput) {
    navUrlInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") launchProxy(navUrlInput.value);
    });
}
