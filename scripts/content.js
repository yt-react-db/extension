// GLOBAL VARIABLES :) don't hurt anybody
//const BACKEND_URL = "http://localhost:8080/permissions/";
const BACKEND_URL = "https://api.yt-react-db.com/permissions/";
// to count the number of attempts before being able to read the channelID
let NB_ATTEMPTS = 0;

/**
 * Just a fancy wrapper around console.log, to display a prefix in front of log messages.
 * 
 * @param {string} message 
 */
function log(message) {
    console.log("%c[yt-react-db]%c", "background-image: linear-gradient(to right, rgb(220, 38, 38), rgb(234, 179, 8)); background-clip:text; text-fill-color: transparent; -webkit-background-clip: text; -webkit-background-clip: text; color: black", "", message);
}

function error(message) {
    console.error("%c[yt-react-db]%c", "background-image: linear-gradient(to right, rgb(220, 38, 38), rgb(234, 179, 8)); background-clip:text; text-fill-color: transparent; -webkit-background-clip: text; -webkit-background-clip: text; color: black", "", message);
}


function getVideoPlayer() {
    return document.querySelector("#ytd-player video");
}

function getPublicationDateElement() {
    return document.querySelector('meta[itemprop="datePublished"]');
}

function getPublicationDateElement2() {
    return document.querySelector("#info-strings > yt-formatted-string"); // innerText
}

function getPublicationDate() {
    const elem = getPublicationDateElement();

    // this element can be missing, so instead of failing, we put a fake value
    // hopefully, we don't need it!
    if (!elem) return "0000-00-00"; // TODO: find a fix

    return elem.content;
}

async function sendErrorMessage(message) {
    error(message);
    await chrome.runtime.sendMessage({
        state: "error",
        message: "An error occured: " + message,
    });
}

function channelIDProcessing(element) {

    log("starting channel ID processing");

    // href prop contains something like: https://www.youtube.com/channel/<channelID>/about'
    const url = element.href;

    const matches = url.match(/\/channel\/([^/]+)\/about/);

    if (matches && matches.length > 1) {

        const channelID = matches[1];
        log(`Attempt #${NB_ATTEMPTS} was successfull: ChannelID ${channelID}`);

        const publishedDate = getPublicationDate();

        (async () => {

            log("fetching permissions for channel ", channelID);
            let resPermissions;
            try {
                resPermissions = await fetch(BACKEND_URL + channelID);
            } catch (e) {
                sendErrorMessage("Could not fetch information")
                return;
            }

            if (!resPermissions.ok && resPermissions.status !== 404) {
                sendErrorMessage("An error occured while fetching permissions");
                return;
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
            log("Sending info to service worker & popup.js");
            // send the channelID to popup.js (to display it)
            // send info to service worker
            await chrome.runtime.sendMessage(message);
        })();


    } else {

        // this is kind of gg here
        // TODO: is it a hard crash? what happens here?

        error("Failed attempt to find channelID in url (require developer attention");
        chrome.runtime.sendMessage({
            state: "error",
            message: "Failed to find channelID in url, reload the page",
        });
        // throw an error?
    }

}

/**
 * 
 */
function processing() {
    log("processing")

    // if not a video, we can stop right there
    if (!window.location.href.startsWith("https://www.youtube.com/watch?v=")) {
        log("Not a video");
        return;
    }

    NB_ATTEMPTS++;

    // href prop contains something like: https://www.youtube.com/channel/<channelID>/about'
    const element = document.querySelector("#infocard-channel-button a");
    // other options are:
    // - #infocard-videos-button a
    // - yt-button-shape > a
    // which contains href with something like: https://www.youtube.com/channel/<channelID>/videos'



    // ----------------------------------------------------------------
    // making sure every useful elements are loaded, if not, try again later
    const isPublicationDateElementMissing = !getPublicationDateElement();
    const isElementMissing = !element;
    const isVideoPlayerMissing = !getVideoPlayer()

    if (isPublicationDateElementMissing && NB_ATTEMPTS > 3 && !isElementMissing && !isVideoPlayerMissing) {
        // for some reason, when you start from the home page,
        // the meta tag containing the publication date isn't present,
        // so for now, I am not going to waste more time trying to find a fix
        // and just ignore it, and return a default fake value in getPublicationDate()
        // TODO: find a better way
        log("The meta tag containing the publication date isn't present");
    } else if (isElementMissing || isPublicationDateElementMissing || isVideoPlayerMissing) {

        // weird behavior, when you go from youtube home page to a video,
        // the publication date is missing, and never loads
        log(`Attempt #${NB_ATTEMPTS} failed:
          element missing: ${isElementMissing},
          publication date missing: ${isPublicationDateElementMissing},
          video player missing: ${isVideoPlayerMissing},
          trying again`);
        setTimeout(processing, 1000 * (1 + Math.log(NB_ATTEMPTS)));
        return;
    }



    log("observing element")
    // observe when href changes => user clicked is now watching a different video
    let elementObserver = new MutationObserver((mr) => {
        log("element mutation observer triggered");
        channelIDProcessing(element);
    });
    elementObserver.observe(element, { attributeFilter: ["href"] });

    // observe when video[src] is emptied
    // => user isn't watching a video anymore
    let videoObserver = new MutationObserver((mutationList) => {
        log("content mutation triggered")
        if (mutationList[0].target.src === "") {
            log("no video playing");

            observeUrl();

            // no need to listen to the element
            try {
                log("removing element observer");
                elementObserver.disconnect();
            } catch (e) {
                error(e);
            }

            // now we need to detect when user starts watching a video
            try {
                log("removing video observer");
                videoObserver.disconnect();
            } catch (e) {
                error(e);
            }

            chrome.runtime.sendMessage({ state: "default" });

        }
    });
    videoObserver.observe(getVideoPlayer(), { attributeFilter: ["src"] });
    channelIDProcessing(element);

}

function isUrlOfVideo() {
    return window.location.href.startsWith("https://www.youtube.com/watch?v=");
}

function observeUrl() {

    log("observing url");

    const urlObserver = new MutationObserver(() => {

        const currentUrl = window.location.href;
        if (url === currentUrl) {
            return;
        }

        log("url changed");
        if (!isUrlOfVideo()) {
            return;
        }

        url = currentUrl;
        NB_ATTEMPTS = 0;
        processing();

        // now we stop listening because once on a video
        // we observe the element containing the channelID
        urlObserver.disconnect();

    });
    urlObserver.observe(document, { subtree: true, childList: true });

}

// STARTING HERE
// -------------------------------------------------------------------------
// script just got injected
log("Starting content script")

// used to compare old url with new one
let url = window.location.href;

// if not a video, we need to start listening to url changes
if (!isUrlOfVideo()) {

    observeUrl();

}

// send message to service worker to change icon
chrome.runtime.sendMessage({ state: "loading" });

processing();

