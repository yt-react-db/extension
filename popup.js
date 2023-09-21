const popup = document.getElementById("yt-react-db-ext-div");

function li(name, value) {
    const li = document.createElement("li");
    li.innerText = `${name}: ${value}`;
    return li;
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(request)
        if (request?.state === "error") {
            popup.innerText = request.message;
        } else if (request?.state === "loaded") {

            const permissions = request.permissions;
            const ul = document.createElement("ul");
            ul.appendChild(li("Channel ID", permissions.channel_id));
            ul.appendChild(li("Channel title", permissions.channel_title));
            ul.appendChild(li("Can real live", permissions.can_react_live));
            ul.appendChild(li("Live delay", permissions.live_reaction_delay));
            ul.appendChild(li("Can upload reaction", permissions.can_upload_reaction));
            ul.appendChild(li("Upload delay", permissions.upload_reaction_delay));
            ul.appendChild(li("Last updated", permissions.last_updated_at));
            ul.appendChild(li("Video publication date", request.publishedDate));
            popup.appendChild(ul);
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