const popup = document.getElementById("yt-react-db-ext-div");

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(request)
        if (request?.state === "error") {
            popup.innerHTML = request.message;
        } else {
            popup.innerText = request.channelID;
        }
    }
);

// Get the current active tab
// maybe use the documentation instead:
// <https://developer.chrome.com/docs/extensions/reference/tabs/#get-the-current-tab>
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // tabs[0] will contain the information about the active tab
    var currentTab = tabs[0];

    // Access the URL of the current tab
    var currentTabUrl = currentTab.url;

    // Now you can use currentTabUrl as needed
    console.log("Current tab URL:", currentTabUrl);
    popup.innerText += currentTabUrl;
});