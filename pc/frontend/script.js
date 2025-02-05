let scanInterval;

function startScanning() {
    fetch("http://localhost:3000/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
        .then(res => res.json())
        .then(data => showTemporaryMessage(data.message, "success"));

    scanInterval = setInterval(() => { getLastUID(); }, 2000);
}

function stopScanning() {
    fetch("http://localhost:3000/scan/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
        .then(res => res.json())
        .then(data => showTemporaryMessage(data.message, "success"));

    clearInterval(scanInterval);
}

function getLastUID() {
    fetch("http://localhost:3000/scan/lastUid", { method: "GET" })
        .then(res => res.json())
        .then(data => {
            if (data.lastScannedUID !== "") {
                if (document.getElementById("addBadgeForm").style.display === "block") {
                    document.getElementById("add_uid").value = data.lastScannedUID;
                    document.getElementById("registerBadgeButton").disabled = false;
                }
                if (document.getElementById("deleteBadgeForm").style.display === "block") {
                    document.getElementById("delete_uid").value = data.lastScannedUID;
                    document.getElementById("deleteBadgeButton").disabled = false;
                }

                // Stop scanning once UID is detected
                clearInterval(scanInterval);
                stopScanning();
            }
        });
}

function registerBadge() {
    fetch("http://localhost:3000/addBadge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            uid: document.getElementById("add_uid").value,
            last_name: document.getElementById("last_name").value,
            first_name: document.getElementById("first_name").value
        })
    })
        .then(res => res.json())
        .then(data => {
            showTemporaryMessage(data.message, data.success ? "success" : "error");
            if (data.success) resetForms();
        });
    sleep(10000);
}

function deleteBadge() {
    fetch("http://localhost:3000/deleteBadge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: document.getElementById("delete_uid").value })
    })
        .then(res => res.json())
        .then(data => {
            showTemporaryMessage(data.message, data.success ? "success" : "error");
            if (data.success) resetForms();
        });
    sleep(10000);
}

function showTemporaryMessage(message, type) {
    let messageBox = document.getElementById("message");
    messageBox.innerText = message;
    messageBox.className = type;  // Apply success or error style
    messageBox.style.display = "block";
    messageBox.style.opacity = "1";

    // setTimeout(() => {
    //     messageBox.style.opacity = "0";  // Smooth fade-out
    //     setTimeout(() => {
    //         messageBox.style.display = "none";
    //     }, 500);  // Wait for fade-out to finish before hiding
    // }, 3000);
}

function resetForms() {
    document.getElementById("add_uid").value = "";
    document.getElementById("delete_uid").value = "";
    document.getElementById("last_name").value = "";
    document.getElementById("first_name").value = "";
    document.getElementById("registerBadgeButton").disabled = true;
    document.getElementById("deleteBadgeButton").disabled = true;
}

function showForm(type) {
    document.getElementById("addBadgeForm").style.display = type === "add" ? "block" : "none";
    document.getElementById("deleteBadgeForm").style.display = type === "delete" ? "block" : "none";

    resetForms();
}

// Load history every 2 seconds
setInterval(() => {
    fetch("http://localhost:3000/history")
        .then(res => res.json())
        .then(data => {
            document.getElementById("history").innerHTML = data.map(e =>
                `<li>${e.first_name} ${e.last_name} - ${e.date} ${e.time} (${e.type})</li>`
            ).join("");
        });
}, 2000);
