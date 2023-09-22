const popup = document.getElementById("yt-react-db-ext-div");

function li(name, value) {
    const li = document.createElement("li");
    li.innerText = `${name}: ${value}`;
    return li;
}

function showPermissions(request) {

    const popup = document.getElementById("yt-react-db-ext-div");

    const permissions = request.permissions;
    if (!permissions.channel_id) {
        popup.innerText = "Channel not found in yt-react-db.";
        return;
    }

    const ul = document.createElement("ul");
    ul.appendChild(li("Channel ID", permissions.channel_id));
    ul.appendChild(li("Channel title", permissions.channel_title));
    ul.appendChild(li("Can real live", permissions.can_react_live));
    ul.appendChild(li("Live delay", permissions.live_reaction_delay));
    ul.appendChild(li("Can upload reaction", permissions.can_upload_reaction));
    ul.appendChild(li("Upload delay", permissions.upload_reaction_delay));
    ul.appendChild(li("Last update", permissions.last_updated_at));
    ul.appendChild(li("Video publication date", request.publishedDate));
    popup.appendChild(ul);

}

// only run if popup is opened while receiving a message
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(request)

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

            // display info only if in right tab
            if (tabs[0].id !== sender.tab.id) {
                return;
            }

            if (request?.state === "error") {
                popup.innerText = request.message;
            } else if (request?.state === "loaded") {
                showPermissions(request);
            }
        });
    }
);

// Get the current active tab
// maybe use the documentation instead:
// <https://developer.chrome.com/docs/extensions/reference/tabs/#get-the-current-tab>
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // tabs[0] will contain the information about the active tab
    const currentTab = tabs[0];

    // Access the URL of the current tab
    const currentTabUrl = currentTab.url;
    const tabId = currentTab.id;

    if (!currentTabUrl.startsWith("https://www.youtube.com/watch?v=")) {
        return;
    }

    chrome.storage.session.get(tabId.toString()).then((res) => {
        if (!res[tabId]) {
            return;
        }
        showPermissions(res[tabId]);

    });
});
