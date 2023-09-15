// GLOBAL VARIABLES :) don't hurt anybody
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

function getPublicationDate() {
    return document.querySelector('meta[itemprop="datePublished"]').content;
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
            const resPermissions = await fetch("http://localhost:8080/permissions/" + channelID);

            if (!resPermissions.ok && resPermissions.status !== 404) {
                error("An error occured while fetching permissions");
                // 
                await chrome.runtime.sendMessage({
                    state: "error",
                    message: ""
                });
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

    // if element isn't loaded yet, try again later
    if (!element) {
        log(`Attempt #${NB_ATTEMPTS} failed, trying again`);
        setTimeout(processing, 1000);
        return;
    }


    log("observing element")
    // observe when href changes => user clicked is now watching a different video
    let elementObserver = new MutationObserver((mr) => {
        log("element mutation observer triggered");
        channelIDProcessing(element);
    }).observe(element, { attributeFilter: ["href"] });

    /*
    // observe when video player is deleted,
    // => user isn't watching a video anymore
    let moviePlayerObserver = new MutationObserver((mutationList) => {
        log("content mutation triggered")
        for (let mutationRecord of mutationList) {
            if (mutationRecord.removedNodes) {
                for (let removedNode of mutationRecord.removedNodes) {
                    log("content mutation ", removedNode.id);
                    log(removedNode)
                    if (removedNode.id === 'movie_player') {
                        log("movie_player removed");

                        log("removing element observer");
                        // no need to listen to the element
                        elementObserver.disconnect();
                        // now we need to detect when user starts watching a video
                        observeUrl();
                        moviePlayerObserver.disconnect();
                        return;
                    }
                }
            }
        }
    }).observe(document.getElementById("movie_player"), { subtree: true, childList: true })
    */
    // #movie_player

    // observe when video[src] is emptied
    // => user isn't watching a video anymore
    let videoObserver = new MutationObserver((mutationList) => {
        log("content mutation triggered")
        if (mutationList[0].target.src === "") {
            log("no video playing");

            observeUrl();

            log("removing element observer");
            // no need to listen to the element
            elementObserver.disconnect();

            log("removing video observer");
            // now we need to detect when user starts watching a video
            videoObserver.disconnect();


        }
    }).observe(document.querySelector("#ytd-player video"), { attributeFilter: ["src"] })
    channelIDProcessing(element);

}

function isUrlOfVideo() {
    return window.location.href.startsWith("https://www.youtube.com/watch?v=");
}

function observeUrl() {

    log("observing url");

    const urlObserver = new MutationObserver(() => {
        log("url changed");

        const currentUrl = window.location.href;
        if (url === currentUrl) {
            return;
        }

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

    log("not watching a video, observing url changes")

    observeUrl();

}

// send message to service worker to change icon
chrome.runtime.sendMessage({ state: "loading" });

processing();

