document.addEventListener("DOMContentLoaded", () => {
    const statusButton = document.getElementById("status");
    const statusPopup = document.getElementById("statuspop");
    const historyButton = document.getElementById("history");
    const historyPopup = document.getElementById("historypop");
    statusButton.addEventListener("click", () => {
        togglePopup(statusPopup, historyPopup);
    });
    historyButton.addEventListener("click", () => {
        togglePopup(historyPopup, statusPopup);
    });
    function togglePopup(activePopup, otherPopup) {
        if (activePopup.style.display === "block") {
            activePopup.style.display = "none";
        } else {
            activePopup.style.display = "block";
            otherPopup.style.display = "none"; // Hide the other popup
        }
    }
    document.addEventListener("click", (event) => {
        if (
            !statusPopup.contains(event.target) &&
            !statusButton.contains(event.target) &&
            !historyPopup.contains(event.target) &&
            !historyButton.contains(event.target)
        ) {
            statusPopup.style.display = "none";
            historyPopup.style.display = "none";
        }
    });
});
document.getElementById("contact").addEventListener("click", () => {
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
    });
});

window.onload = function() {
    if (window.innerWidth <= 1024) {
        alert('This site is best viewed on a desktop. Please use a computer for an optimal experience.');
    }
};
