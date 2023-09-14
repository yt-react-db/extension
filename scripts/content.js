/**
 * LRU Cache to store and retrieve user permissions and avoid too many requests
 * to the API.
 * Let's make an abstraction above LocalStorage (so we can change it to indexedDB
 * if needed (I don't think so but we never know)).
 * 
 * specifications:
 * 
 * - key is channelID
 * - value is an object containing permissions, Channel ID and title, and expiracy date
 * - each value can expire
 * - expiracy should be a parameter
 * - number of entries should be a parameter
 * - when reaching full capacity, the LRU should be removed
 * - if key not found -> fetch permissions -> whether or not channelID was found a line should be added (with expiracy)
 * 
 * I am probably overthinking this, in theory I could just ignore that, the 
 * cache API should do everything for me, fetch uses the cache by default, if I
 * set a correct "Cache-Control: max-age="
 * Nah I can't, I still need to store the information somewhere, using the cache api isn't it!
 * well maybe, I just need to check if I can use "caches" in both content script & popup.js (same context? probably not)
class LRUCache {

    constructor(maxSize = 1000, expiracy = 0) { }

}
 */
// to count the number of attempts before being able to read the channelID
let NB_ATTEMPTS = 0;

// Necessary when navigating  inside youtube
// (youtube is a single-page application, so the content script isn't injected
// every time we click on a link (I think))
/*
let url = window.location.href;
let observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (url !== currentUrl) {
        url = currentUrl;
        NB_ATTEMPTS = 0;
        getChannelId();
    }
});
observer.observe(document, { subtree: true, childList: true });
*/

chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    NB_ATTEMPTS = 0;
    getChannelId();
    // Check if the URL matches your SPA's pattern
    if (details.url.match(/https:\/\/www.youtube.com\/watch\?v=.*/)) {
        ""
        // Handle URL change here
        console.log('URL Changed:', details.url);
    }
});



// DOM is loaded


/**
 * Just a fancy wrapper around console.log, to display a prefix in front of log messages.
 * 
 * @param {string} message 
 */
function log(message) {
    console.log("%c[yt-react-db]%c %s", "background-image: linear-gradient(to right, rgb(220, 38, 38), rgb(234, 179, 8)); background-clip:text; text-fill-color: transparent; -webkit-background-clip: text; -webkit-background-clip: text; color: black", "", message);
}

function getPublicationDate() {
    return document.querySelector('meta[itemprop="datePublished"]').content;
}
/**
 * 
 */
function getChannelId() {
    try {
        NB_ATTEMPTS++;

        // contains something like: https://www.youtube.com/channel/<channelID>/videos'
        const url = document.querySelector("yt-button-shape > a").href;

        const matches = url.match(/\/channel\/([^/]+)\/videos/);

        if (matches && matches.length > 1) {

            const channelID = matches[1];
            log(`Attempt #${NB_ATTEMPTS} was successfull: ChannelID ${channelID}`);

            const publishedDate = getPublicationDate();

            (async () => {

                const resPermissions = await fetch("http://localhost:8080/permissions/" + channelID);
                // not found
                if (resPermissions.statusCode === 404) {
                    // change icon to question mark
                    // we still need to store the information somewhere tho
                    // localstorage? or indexedDB?
                    // TODO:
                }
                else if (!resPermissions.ok) {
                    // TODO:
                }

                /*

                permissions contains one of:
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
                const permissions = await resPermissions.json();

                const message = {
                    state: "loaded",
                    channelID,
                    url: window.location.href,
                    publishedDate,
                    permissions,
                }
                log("Sending channel ID to popup.js");
                // send the channelID to popup.js (to display it)
                const response = await chrome.runtime.sendMessage(message);
            })();

        } else {
            throw new Error("Failed attempt to match channelID in url");
        }
    } catch (e) { // TODO: check type of error
        log(`Attempt #${NB_ATTEMPTS} failed, trying again`);
        setTimeout(getChannelId, 1000);
    }

}

// -----------------------------------------------------------------------------
// BEGINNING
log("starting extension content script")
chrome.runtime.sendMessage({ state: "loading" });

// set loading image

getChannelId();

