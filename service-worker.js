function log(...message) {
    console.log("%c[yt-react-db]%c[service]%c", "background-image: linear-gradient(to right, rgb(220, 38, 38), rgb(234, 179, 8)); background-clip:text; text-fill-color: transparent; -webkit-background-clip: text; -webkit-background-clip: text; color: black", "background-color: white; color: black", "", ...message);
}

/**
 * Compares date of publication of the video with the delay and tells us if the
 * delay has passed.
 * 
 * If delay has passed, return "green", otherwise return "orange".
 * 
 * Ok this is a heuristic, but it should be good enough.
 * (to do it better, add individual units: month to month, weeek to week..., and
 * wrap around if needed)
 * 
 * @param {string} delay Represents the delay one must wait before reacting/uploading (ex: "3d", "10w", "3m", "1y")
 * @param {string} publishedDate "yyyy-MM-dd" date of publication of the video (ex: "2023-09-13")
 * @returns {boolean} true if delay has passed, false otherwise
 */
function hasDelayPassed(delay, publishedDate) {
    const units = { d: 1, w: 7, m: 31, y: 365 };

    const [amount, unit] = delay.match(/(\d+)([dwmy])/).slice(1);
    const newDate = new Date(publishedDate);
    newDate.setDate(newDate.getDate() + (amount * (units[unit])));

    const today = new Date();

    return newDate <= today;
}


function getColorWhenDelay(delay, publishedDate) {
    if (publishedDate === "0000-00-00") { // if couldn't get publication Date
        return "white";
    } else if (hasDelayPassed(delay, publishedDate)) {
        return "green";
    } else {
        return "orange";
    }

}

function getPermissionColor(permission, delay, publishedDate) {
    if (permission === "yes") {
        return "green";
    } else if (permission === "no") {
        return "red";
    } else {
        return getColorWhenDelay(delay, publishedDate);
    }

}

function getPermissionsIconPath({ permissions, publishedDate }) {

    // if permissions contains a message property then it must come from a
    // 404 permissions not found (not really clean code, but whatever)
    if (permissions.message) {
        return "images/question-mark.png";
    }

    const canReactLiveColor = getPermissionColor(
        permissions.can_react_live,
        permissions.live_reaction_delay,
        publishedDate
    );
    const canUploadReactionColor = getPermissionColor(
        permissions.can_upload_reaction,
        permissions.upload_reaction_delay,
        publishedDate
    );

    return "images/" + canReactLiveColor + "-" + canUploadReactionColor + ".png";
}


function setIcon(iconPath, tabId) {

    log(iconPath)
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0].id !== tabId) {
            return;
        }
        chrome.action.setIcon({ path: iconPath });

    });
}

chrome.runtime.onMessage.addListener(
    /**
     * 
     * (ok typescript would be nice here)
     * request looks this:
     * {
     *   state: string,
     *   channelID: string,
     *   url: string,
     *   publishedDate: string,
     *   permissions: {...}
     * }
     * 
     * and permissions is one of: 
        - {message: 'Permission not found for given channel_ID'}
        - {
            "channel_id": "UCIv6GIlP5uXbiu666bOUobQ",
            "channel_title": "ComputerBread",
            "can_react_live": "yes",
            "live_reaction_delay": "1d",
            "can_upload_reaction": "yes",
            "upload_reaction_delay": "1d",
            "last_updated_at": "2023-09-05T15:30:49.004903Z"
        }
     */
    function (request, sender, sendResponse) {
        log(request)
        if (request?.state === "loading") {
            log("loading");
            setIcon("images/load.png", sender.tab.id);
        } else if (request?.state === "loaded") {
            log("loaded")
            const info = {
                channelID: request.channelID,
                publishedDate: request.publishedDate,
                permissions: request.permissions,
            };

            const iconPath = getPermissionsIconPath(info);

            // we change icon only if we are in the good tab
            //!!!!!!!!!!!!!!!!!!!!!!!!!
            setIcon(iconPath, sender.tab.id);
            // store request in storage
            let obj = {};
            log("sender tab id", sender.tab.id)
            obj[sender.tab.id] = { ...request, iconPath };
            chrome.storage.session.set(obj, () => { log("stored?") });

        } else if (request?.state === "error") {
            log("error")
            console.error(request.message);
            setIcon("images/error.png", sender.tab.id);
        } else if (request?.state === "default") {
            chrome.action.setIcon({ path: "images/icon-16.png" });
        }
    }
);


// when active tab changes
chrome.tabs.onActivated.addListener(() => {
    log("tab changed?")
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

        // Access the URL of the current tab
        const currentTabUrl = tabs[0].url;

        log("Current tab URL:", currentTabUrl);
        if (!currentTabUrl.startsWith("https://www.youtube.com/watch?v=")) {
            chrome.action.setIcon({ path: "images/icon-16.png" });
            return;
        }

        const tabId = tabs[0].id;

        chrome.action.setIcon({ path: "images/load.png" });
        chrome.storage.session.get(tabId.toString()).then((res) => {
            log("res", res);
            if (!res[tabId]) {
                return;
            }
            chrome.action.setIcon({ path: res[tabId].iconPath });
            // TODO: do I need to send info to popup.js?
        });

    });
});

// when tab is removed
chrome.tabs.onRemoved.addListener((tabId) => {
    log("Tab removed:", tabId);
    // we remove info from storage
    chrome.storage.session.remove(tabId.toString());
});