// @ts-check
const QRCode = require("qrcode");
const iso = require('iso-3166-1');
const body = document.body;
const div = document.createElement("div");
const canvasDiv = document.createElement("div");
const header = document.createElement("div");
const footer = document.createElement("div");
const copyBtn = document.createElement("a");
const openLinkBtn = document.createElement("a");
const openLinkBtnDiv = document.createElement("div");
const outdidLogo = document.createElement("div");
const outdidName = document.createElement("p");
const description = document.createElement("p");
const close = document.createElement("span");
const canvas = document.createElement("canvas");
const loader = document.createElement("div");
const { Resolver } = require("did-resolver");
const { getResolver } = require("web-did-resolver");
const { verifyPresentation } = require("did-jwt-vc");
const utils = require("./utils.js");

// proof request expiration
const CANCEL_PROOF_AFTER_MS = 15 * 60 * 1000; // 15 minutes

const outdidLogoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1080"><defs><style>.outdid-logo-black-a{fill:none;}.outdid-logo-black-b{clip-path:url(#outdid-logo-black-a);}.outdid-logo-black-c{fill:#231f20;}.outdid-logo-black-d{clip-path:url(#outdid-logo-black-b);}</style><clipPath id="outdid-logo-black-a"><rect class="outdid-logo-black-a" x="-114.4917" y="-156.4739" width="1290.0579" height="709.2579"/></clipPath><clipPath id="outdid-logo-black-b"><rect class="outdid-logo-black-a" x="974.5907" y="-156.4739" width="1290.0579" height="709.2579"/></clipPath></defs><g class="outdid-logo-black-b"><path class="outdid-logo-black-c" d="M1072.28,542.4544c0-291.0693-236.81-527.8575-527.8792-527.8575S16.5429,251.3851,16.5429,542.4544c0,148.5782,63.3539,291.1743,173.84,391.2435A19.6165,19.6165,0,1,0,216.71,904.61C114.4127,811.9757,55.7473,679.9923,55.7473,542.4544,55.7473,273.0055,274.97,53.8013,544.4,53.8013c269.4525,0,488.6748,219.2042,488.6748,488.6531S813.8529,1031.1074,544.4,1031.1074A488.4405,488.4405,0,0,1,314.9023,973.75a19.6224,19.6224,0,0,0-18.5079,34.6065A527.8353,527.8353,0,0,0,544.4,1070.3155C835.47,1070.3155,1072.28,833.5237,1072.28,542.4544Z"/><path class="outdid-logo-black-c" d="M834.4443,803.8015a19.6043,19.6043,0,0,0,29.1207,26.2546,429.0569,429.0569,0,0,0,3.6632-571.0983,19.6054,19.6054,0,0,0-29.44,25.9,389.8316,389.8316,0,0,1-3.3443,518.9441Z"/><path class="outdid-logo-black-c" d="M774.0253,179.2373A428.1294,428.1294,0,0,0,544.4,112.6442c-237.002,0-429.81,192.8082-429.81,429.81s192.8082,429.81,429.81,429.81A428.1721,428.1721,0,0,0,769.728,908.3273,19.6,19.6,0,1,0,749.1,874.9927,389.1367,389.1367,0,0,1,544.4,933.06c-215.3816,0-390.6022-175.2242-390.6022-390.6057S329.0188,151.8486,544.4,151.8486a388.696,388.696,0,0,1,208.61,60.51,19.6127,19.6127,0,0,0,21.0153-33.1209Z"/><path class="outdid-logo-black-c" d="M544.4,210.6951A332.41,332.41,0,0,0,337.8634,283.02a19.6009,19.6009,0,1,0,24.45,30.6425A289.15,289.15,0,0,1,544.4,249.9c161.3179,0,292.5585,131.2406,292.5585,292.5549,0,161.2816-131.2406,292.5222-292.5585,292.5222-161.3142,0-292.5549-131.2406-292.5549-292.5222a290.7439,290.7439,0,0,1,50.618-164.289,19.6077,19.6077,0,0,0-32.4107-22.077,329.7874,329.7874,0,0,0-57.4117,186.366c0,182.9346,148.8246,331.7266,331.7593,331.7266,182.9383,0,331.7629-148.792,331.7629-331.7266S727.3387,210.6951,544.4,210.6951Z"/><path class="outdid-logo-black-c" d="M632.9147,758.7563A233.12,233.12,0,0,0,778.1124,542.4544c0-128.8674-104.841-233.712-233.712-233.712-128.8673,0-233.6939,104.8446-233.6939,233.712,0,117.548,87.8766,217.2584,204.4319,231.8713a18.8527,18.8527,0,0,0,2.46.1413,19.6075,19.6075,0,0,0,2.424-39.0631c-96.9711-12.1708-170.108-95.1124-170.108-192.95,0-107.2506,87.257-194.5076,194.4858-194.5076,107.2506,0,194.5076,87.257,194.5076,194.5076a194.0179,194.0179,0,0,1-120.8888,180,19.62,19.62,0,0,0,14.8955,36.3022Z"/><path class="outdid-logo-black-c" d="M680.047,542.4544c0-74.8-60.843-135.6611-135.6466-135.6611-74.7819,0-135.6248,60.8611-135.6248,135.6611,0,74.8036,60.8429,135.6284,135.6248,135.6284C619.204,678.0828,680.047,617.258,680.047,542.4544ZM544.4,638.8748a96.4386,96.4386,0,1,1,96.4422-96.42A96.5452,96.5452,0,0,1,544.4,638.8748Z"/><circle class="outdid-logo-black-c" cx="544.4077" cy="542.4471" r="28.5989"/><circle class="outdid-logo-black-a" cx="548.9272" cy="397.1173" r="559.5279"/></g><path class="outdid-logo-black-c" d="M1073.9639,582.69C1044.3153,848.858,818.57,1055.8319,544.4822,1055.8319S44.649,848.858,15.0008,582.69Z"/><g class="outdid-logo-black-d"><circle class="outdid-logo-black-a" cx="1638.0096" cy="397.1173" r="559.5279"/></g></svg>
`;
const outdidLogoSvgWhite = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1080"><defs><style>.outdid-logo-white-a{fill:none;}.outdid-logo-white-b{clip-path:url(#outdid-logo-white-a);}.outdid-logo-white-c{clip-path:url(#outdid-logo-white-b);}.outdid-logo-white-d{fill:#fff;}</style><clipPath id="outdid-logo-white-a"><rect class="outdid-logo-white-a" x="-1214.4917" y="-156.4739" width="1290.0579" height="709.2579"/></clipPath><clipPath id="outdid-logo-white-b"><rect class="outdid-logo-white-a" x="-125.4093" y="-156.4739" width="1290.0579" height="709.2579"/></clipPath></defs><g class="outdid-logo-white-b"><circle class="outdid-logo-white-a" cx="-551.0728" cy="397.1173" r="559.5279"/></g><g class="outdid-logo-white-c"><path class="outdid-logo-white-d" d="M1061.362,542.4544c0-291.0693-236.81-527.8575-527.8792-527.8575S5.6253,251.3851,5.6253,542.4544c0,148.5782,63.3539,291.1743,173.84,391.2435A19.6165,19.6165,0,1,0,205.7925,904.61C103.4951,811.9757,44.83,679.9923,44.83,542.4544c0-269.4489,219.2223-488.6531,488.6531-488.6531,269.4525,0,488.6748,219.2042,488.6748,488.6531s-219.2223,488.653-488.6748,488.653A488.4405,488.4405,0,0,1,303.9847,973.75a19.6224,19.6224,0,0,0-18.5079,34.6065,527.8353,527.8353,0,0,0,248.006,61.9589C824.5521,1070.3155,1061.362,833.5237,1061.362,542.4544Z"/><path class="outdid-logo-white-d" d="M823.5267,803.8015a19.6043,19.6043,0,0,0,29.1207,26.2546,429.0569,429.0569,0,0,0,3.6632-571.0983,19.6054,19.6054,0,0,0-29.44,25.9,389.8316,389.8316,0,0,1-3.3443,518.9441Z"/><path class="outdid-logo-white-d" d="M763.1077,179.2373a428.1294,428.1294,0,0,0-229.6249-66.5931c-237.002,0-429.81,192.8082-429.81,429.81s192.8082,429.81,429.81,429.81A428.1721,428.1721,0,0,0,758.81,908.3273a19.6,19.6,0,1,0-20.6276-33.3346,389.1367,389.1367,0,0,1-204.7,58.0674c-215.3816,0-390.6022-175.2242-390.6022-390.6057S318.1012,151.8486,533.4828,151.8486a388.696,388.696,0,0,1,208.61,60.51,19.6127,19.6127,0,0,0,21.0153-33.1209Z"/><path class="outdid-logo-white-d" d="M533.4828,210.6951A332.41,332.41,0,0,0,326.9458,283.02a19.6009,19.6009,0,1,0,24.45,30.6425A289.15,289.15,0,0,1,533.4828,249.9c161.3179,0,292.5585,131.2406,292.5585,292.5549,0,161.2816-131.2406,292.5222-292.5585,292.5222-161.3142,0-292.5549-131.2406-292.5549-292.5222a290.7439,290.7439,0,0,1,50.618-164.289,19.6077,19.6077,0,0,0-32.4107-22.077,329.7874,329.7874,0,0,0-57.4117,186.366c0,182.9346,148.8246,331.7266,331.7593,331.7266,182.9383,0,331.7629-148.792,331.7629-331.7266S716.4211,210.6951,533.4828,210.6951Z"/><path class="outdid-logo-white-d" d="M621.9971,758.7563A233.12,233.12,0,0,0,767.1948,542.4544c0-128.8674-104.841-233.712-233.712-233.712-128.8673,0-233.6939,104.8446-233.6939,233.712,0,117.548,87.8766,217.2584,204.4319,231.8713a18.8527,18.8527,0,0,0,2.46.1413,19.6075,19.6075,0,0,0,2.424-39.0631c-96.9711-12.1708-170.108-95.1124-170.108-192.95,0-107.2506,87.257-194.5076,194.4858-194.5076,107.2506,0,194.5076,87.257,194.5076,194.5076a194.0179,194.0179,0,0,1-120.8888,180,19.62,19.62,0,0,0,14.8955,36.3022Z"/><path class="outdid-logo-white-d" d="M669.1294,542.4544c0-74.8-60.843-135.6611-135.6466-135.6611-74.7819,0-135.6248,60.8611-135.6248,135.6611,0,74.8036,60.8429,135.6284,135.6248,135.6284C608.2864,678.0828,669.1294,617.258,669.1294,542.4544Zm-135.6466,96.42a96.4386,96.4386,0,1,1,96.4422-96.42A96.5452,96.5452,0,0,1,533.4828,638.8748Z"/><circle class="outdid-logo-white-d" cx="533.49" cy="542.4471" r="28.5989"/><circle class="outdid-logo-white-a" cx="538.0096" cy="397.1173" r="559.5279"/></g><path class="outdid-logo-white-d" d="M1063.0463,582.69c-29.6486,266.1678-255.3936,473.1417-529.4817,473.1417S33.7314,848.858,4.0832,582.69Z"/></svg>
`;

const waitText = "Please wait while the proof is generating";
const descriptionText = "Scan this QR code with your mobile phone that has OutDID installed and generate a proof. <br>"
    + "In order to submit the proof, you will need to be connected to the internet.";

const CANVAS_HEIGHT = window.innerWidth < 800 ? window.innerHeight * 0.4 : 400;
const CANVAS_WIDTH = window.innerWidth < 800 ? window.innerWidth * 0.4 : 400;

const PROOF_PARAMETERS = ["minAge", "maxAge", "nationality", "checkNationality", "uniqueID"];

var REQUEST_FROM;

div.style.height = "100%";
div.style.width = "100%";

// prevent accidental selection of the background
// div.style.pointerEvents = "none";
div.style.userSelect = "none";

// fixed position over the whole window
div.style.display = "flex";
div.style.position = "fixed";
div.style.left = "0";
div.style.top = "0";

// align the qr code at the center
div.style.alignItems = "center";
div.style.justifyContent = "center";

// need to be on top and dim background
div.style.zIndex = "99999";
div.style.background = "rgba(0, 0, 0, 0.75)";

function timestamp() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}T${now.getUTCHours()}:${now.getUTCMinutes()}:${now.getUTCSeconds()}.${now.getUTCMilliseconds()}Z`;
}

var timeout, interval;

function closeProofOverlay() {
    console.log(timestamp() + " Closing proof overlay");
    if (timeout != null) {
        try {
            clearTimeout(timeout);
        } catch (_) {}
    }
    if (interval != null) {
        try {
            clearInterval(interval);
            interval = null;
        } catch (_) {}
    }
    try {
        canvasDiv.removeChild(loader);
        canvasDiv.appendChild(canvas);
        canvasDiv.appendChild(footer);
    } catch (_) { }
    try {
        description.innerHTML = descriptionText;
        body.removeChild(div);
    } catch (_) {}
}

var globalRequestID, globalServerHandlerUrl;
function cancelProof() {
    closeProofOverlay();
    if (globalRequestID) {
        console.log(timestamp() + " Cancelling proof");
        const cancelProofEndpoint = new URL(globalServerHandlerUrl);
        cancelProofEndpoint.pathname += "cancelProof";
        cancelProofEndpoint.searchParams.set("requestID", globalRequestID);
        cancelProofEndpoint.searchParams.set("reqfrom", REQUEST_FROM);
        post(cancelProofEndpoint, {
            requestID: globalRequestID,
            reqfrom: REQUEST_FROM,
        });
        globalRequestID = null;
    }
}

div.addEventListener("click", function (e) {
    if (e.target === this || e.target === close) {
        if (confirm("If you close the overlay, the flow of the proof generation will be interrupted and you will need to start over.")) {
            cancelProof();
        }
    }
});

canvasDiv.style.alignItems = "center";
canvasDiv.style.justifyContent = "center";
canvasDiv.style.minHeight = `${CANVAS_HEIGHT + 140}px`;
// canvas.style.marginBottom = "40px";
canvasDiv.style.paddingBottom = "30px";
canvasDiv.style.width = `${CANVAS_WIDTH + 80}px`;
canvasDiv.style.position = "relative";
canvasDiv.style.textAlign = "center";
canvasDiv.style.margin = "auto";
canvasDiv.style.display = "block";
canvasDiv.style.background = "white";
canvasDiv.style.borderRadius = "24px";

description.innerHTML = descriptionText;
description.style.zIndex = "1";
description.style.margin = "16px 40px";
description.style.display = "block";
description.style.fontSize = window.innerWidth < 800 ? "12px" : "19px";
if (window.innerWidth < 800) {
    copyBtn.style.fontSize = "12px";
    openLinkBtn.style.fontSize = "12px";
}

close.innerHTML = "&times";
close.setAttribute("id", "outdid-close");
close.style.cursor = "pointer";

outdidLogo.innerHTML = outdidLogoSvgWhite;
outdidLogo.style.width = "34px";
// outdidLogo.style.height = "24px";
outdidName.innerHTML = "OutDID";
outdidName.style.display = "flex";
outdidName.style.flex = "1";
outdidName.style.alignItems = "flex-start";
outdidName.style.color = "white";
outdidName.style.margin = "0 0 0 10px";
outdidName.style.fontWeight = "600";
outdidName.style.fontSize = "30px";

header.setAttribute("id", "outdid-header");
footer.setAttribute("id", "outdid-footer");
footer.appendChild(copyBtn);
footer.appendChild(openLinkBtnDiv);
openLinkBtnDiv.appendChild(openLinkBtn);
openLinkBtnDiv.style.marginTop = "10px";

function copyLink(proofUrl) {
    navigator.clipboard.writeText(proofUrl);
    copyBtn.innerHTML = "Link copied!";
    // @ts-ignore
    copyBtn.onclick = "#";
    setTimeout(() => {
        copyBtn.onclick = () => copyLink(proofUrl);
        copyBtn.innerHTML = "Copy link";
    }, 2000);
}

copyBtn.innerHTML = "Copy link";
copyBtn.setAttribute("class", "outdid-btn");
openLinkBtn.innerHTML = "Open link in Outdid";
openLinkBtn.setAttribute("class", "outdid-btn");

canvasDiv.appendChild(description)
canvasDiv.appendChild(canvas);
div.appendChild(canvasDiv);
header.appendChild(outdidLogo);
header.appendChild(outdidName);
header.appendChild(close);
canvasDiv.appendChild(header);
canvasDiv.appendChild(footer);

loader.setAttribute("id", "outdid-loader");
const loaderSize = window.innerWidth < 800 ? 80 : 180;
const loaderPosLeft = (CANVAS_WIDTH + 80) * 0.5 - (loaderSize / 2);
const loaderPosTop = (CANVAS_HEIGHT + 140) * 0.5 - (loaderSize / 2);
const style = document.createElement('style');
const css = `
    #outdid-loader {
      /* border: 16px solid #f3f3f3; */
      /* border-radius: 50%; */
      /* border-top: 16px solid #3498db; */
      width: ${loaderSize}px;
      height: ${loaderSize}px;
      -webkit-animation: spin 5030ms linear infinite; /* Safari */
      animation: spin 5030ms linear infinite;
      position: absolute;
      top: ${loaderPosTop}px;
      left: ${loaderPosLeft}px;
      z-index: 1;
    }

    /* Safari */
    @-webkit-keyframes spin {
      0% { -webkit-transform: rotate(0deg); }
      100% { -webkit-transform: rotate(360deg); }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    #outdid-close {
        font-size: 30px;
        font-weight: 400;
        color: white;
        /* margin-bottom: ${CANVAS_HEIGHT + 230}px; */
        /* margin-left: ${CANVAS_WIDTH + 190}px; */
    }

    #outdid-header {
        top: -40px;
        align-items: center;
        position: absolute;
        left: 0;
        display: flex;
        justify-content: space-between;
        height: 30px;
        width: 100%;
    }

    #outdid-footer {
        /* display: flex; */
        margin-top: 25px;
        justify-content: center;
    }

    .outdid-btn {
        margin: 0 auto;
        font-size: 18px;
        text-decoration: none;
        color: #7f7f7f;
        cursor: pointer;
    }
`;
style.innerHTML = css;
document.getElementsByTagName('head')[0].appendChild(style);

// set the loader to be outdid's logo
loader.innerHTML = outdidLogoSvg;

function post(url, body) {
    return fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    });
}

class OutdidSDK {
    /** @private */
    createCanvas() {
        QRCode.toCanvas(canvas, this.proofUrl.toString(), {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            margin: 0
        }, function (error) {
            if (error) throw error;
        });

        copyBtn.onclick = () => copyLink(this.proofUrl.toString());
        openLinkBtn.href = this.proofUrl.toString();
    }

    /** @private */
    async registerCallback(requestID) {
        console.log(timestamp() + " Requesting proof with ID " + requestID);
        const requestProofEndpoint = new URL(this.serverHandlerUrl);
        requestProofEndpoint.pathname += "requestProof";
        requestProofEndpoint.searchParams.set("requestID", requestID);
        requestProofEndpoint.searchParams.set("reqfrom", REQUEST_FROM);
        await post(requestProofEndpoint, {
            requestID,
            reqfrom: REQUEST_FROM,
        }).catch((err) => {
            closeProofOverlay();
            throw err;
        });

        return new Promise((resolve, reject) => {
            const pingEndpoint = new URL(this.serverHandlerUrl);
            pingEndpoint.pathname += "ping";
            pingEndpoint.searchParams.set("requestID", requestID);
            pingEndpoint.searchParams.set("reqfrom", REQUEST_FROM);
            interval = setInterval(() => {
                var err = false;
                post(pingEndpoint, {
                    requestID,
                    reqfrom: REQUEST_FROM,
                }).then((response) => {
                    if (response.ok) {
                        return response.json();
                    } else if (response.status === 304) {
                        // ignored, break the promise chain
                        throw Error("ignored");
                    } else {
                        err = true;
                        return response.text();
                    }
                }).then((body) => {
                    if (err) {
                        console.log(timestamp() + " Server returned an unexpected response: " + body);
                        closeProofOverlay();
                        reject(new Error(body));
                        return;
                    }
                    if (body === "proofStarted") {
                        console.log(timestamp() + " Proof started");
                        try {
                            canvasDiv.removeChild(canvas);
                            canvasDiv.removeChild(footer);
                            canvasDiv.appendChild(loader);
                            description.innerHTML = waitText;
                        } catch (_) {}
                    } else if (body.proofResult !== undefined) {
                        console.log(timestamp() + " Proof received");
                        resolve(body.proofResult);
                        closeProofOverlay();
                    } else {
                        console.log(timestamp() + " Verification failed: " + body.verificationFailed);
                        reject(new Error(body.verificationFailed));
                        closeProofOverlay();
                    }
                }).catch((err) => {
                    if (err.message !== "ignored") {
                        reject(err);
                        closeProofOverlay();
                    }
                });
            }, 2000);
        });
    }

    /** @private */
    addParametersToProofUrl(requestID) {
        console.log(timestamp() + " Adding the following parameters to the proof request: " + PROOF_PARAMETERS);
        for (var param of PROOF_PARAMETERS) {
            // nationality should be a valid country
            if ((param === "nationality" && this.proofParameters.nationality) ||
                (param === "nationality" && this.proofParameters.checkNationality && this.proofParameters.checkNationality != 0)) {
                if (this.proofParameters.nationality == undefined || this.proofParameters.nationality == "") {
                    throw new Error("Nationality cannot be empty if checkNationality is defined and non-zero");
                }
                if ((this.proofParameters.nationality.length == 2 && iso.whereAlpha2(this.proofParameters.nationality) == undefined)
                    || (this.proofParameters.nationality.length == 3 && iso.whereAlpha3(this.proofParameters.nationality) == undefined)
                    || (this.proofParameters.nationality.length != 2 && this.proofParameters.nationality.length != 3 && (iso.whereCountry(this.proofParameters.nationality) == undefined))
                ) {
                    throw new Error("Nationality is not a country");
                }
            }
            if (this.proofParameters[param] !== undefined
                && this.proofParameters[param] !== null
                && this.proofParameters[param] !== "") {

                if (this.proofParameters[param].trim && this.proofParameters[param].trim() == "") continue;
                this.proofUrl.searchParams.set(param, this.proofParameters[param]);
            }
        }

        // if nationality has not been set, checkNationality also does not need to be set
        if (this.proofUrl.searchParams.get("nationality") == null) {
            this.proofUrl.searchParams.delete("checkNationality");
        }
        this.proofUrl.searchParams.set("requestID", requestID);
        this.proofUrl.searchParams.set("requestingDomain", document.location.hostname);
        this.proofUrl.searchParams.set("reqfrom", REQUEST_FROM);
    }

    constructor(apiKey) {
        this.proofUrl = new URL("https://request.outdid.io/proof");
        this.serverHandlerUrl = new URL("https://api.outdid.io");
        globalServerHandlerUrl = this.serverHandlerUrl;

        // TODO: check if apiKey is valid
        if (apiKey !== undefined) {
            REQUEST_FROM = apiKey;
        }
    }

    /**
     * Request a proof generated from OutDID's mobile app
     * @param {Object} proofParameters The required proof parameters that should be valid for the requested user
     * @param {boolean?} proofParameters.uniqueID Specify whether to generate a user ID unique for your use-case
     * @param {string?} proofParameters.nationality Require users to be or not to be of a specific nationality
     * @param {number?} proofParameters.checkNationality Determines whether @param proofParameters.nationality requires users to be (@param proofParameters.checkNationality is set to `1` or ignored) or not to be (@param proofParameters.checkNationality set to `2`) of the specified nationality, or ignored (@param proofParameters.checkNationality set to `0`)
     * @param {string?} proofParameters.minAge Require users to be at least @param proofParameters.minAge years old
     * @param {string?} proofParameters.maxAge Require users to be at most @param proofParameters.maxAge years old
     * @returns {Promise} A `Promise` that is fulfilled when the proof is done on the app
     */
    async requestProof(proofParameters) {
        const proof = await this._requestProof(proofParameters);
        return proof;
    }

    /** @private */
    _requestProof(proofParameters) {
        if (proofParameters === undefined || proofParameters === null) {
            throw new Error("Proof parameters cannot be undefined");
        }
        const requestID = Array.from({ length: 16 }, () => {
            var rand = Math.floor(Math.random() * 255).toString(16);
            if (Number("0x" + rand) < 0x10) rand = "0" + rand;
            return rand;
        }).join("");

        this.proofParameters = proofParameters;
        globalRequestID = requestID;
        this.addParametersToProofUrl(requestID);
        const promise = this.registerCallback(requestID);

        // set a timeout that will cancel the request after some time
        // (which will most likely happen if the server is not reachable, or its
        // cache has been cleared before the frontend was able to reach it)
        this.requestExpirationTimeout = setTimeout(() => {
            var throwErr = true;
            try {
                cancelProof();
            } catch (_) {
                throwErr = false;
            }

            if (throwErr) {
                throw new Error("Proof not received within timeout. Please check your network connection and try again later.");
            }
        }, CANCEL_PROOF_AFTER_MS);
        timeout = this.requestExpirationTimeout;

        promise.then(() => {
            try {
                clearTimeout(this.requestExpirationTimeout);
            } catch (err) {
                console.error("err: ", err);
            }
        }).catch((err) => {
            clearTimeout(this.requestExpirationTimeout);
            throw err;
        });

        this.createCanvas();
        body.appendChild(div);

        return promise;
    }

    /**
     * Verify the generated proof using Outdid's verifiable credentials
     * @param {string} proof The JWT object returned from `requestProof`
     * @returns {Promise<{result: boolean, cert, params}>} Whether the proof is valid or not, the generated certificate, and the parameters in the proof
     */
    async verifyProof(proof) {
        const resolver = new Resolver(getResolver())

        const vp = await verifyPresentation(proof, resolver);
        if (!vp || !vp.verified) {
            throw new Error("Verifiable Presentation is not valid");
        }
        if (vp.payload.nonce !== globalRequestID) {
            throw new Error("Verifiable Presentation nonce is not the same as the request ID");
        }
        if (vp.verifiablePresentation.verifiableCredential === undefined) {
            throw new Error("Verifiable credential is not defined.");
        }
        if (vp.verifiablePresentation.verifiableCredential.length !== 1) {
            throw new Error("Incorrect number of verifiable credentials: " + vp.verifiablePresentation.verifiableCredential.length);
        }
        var params = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.proofParameters;
        const proofVerified = utils.verifyParameters(this.proofParameters, params, vp.verifiablePresentation.verifiableCredential[0].credentialSubject.appID);
        const appID = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.appID;
        const uniqueID = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.uniqueID;
        if (appID != "") {
            params = {...params, appID, uniqueID};
        }
        // can get unique user ID from vp.verifiablePresentation.verifiableCredential[0].credentialSubject.uniqueID
        return { result: proofVerified, cert: vp, params: params };
    }

    /**
     * Request and verify a proof generated from OutDID's mobile app
     * @param {Object} proofParameters The required proof parameters that should be valid for the requested user
     * @param {boolean?} proofParameters.uniqueID Specify whether to generate a user ID unique for your use-case
     * @param {string?} proofParameters.nationality Require users to be or not to be of a specific nationality
     * @param {number?} proofParameters.checkNationality Determines whether @param proofParameters.nationality requires users to be (@param proofParameters.checkNationality is set to `1` or ignored) or not to be (@param proofParameters.checkNationality set to `2`) of the specified nationality, or ignored (@param proofParameters.checkNationality set to `0`)
     * @param {string?} proofParameters.minAge Require users to be at least @param proofParameters.minAge years old
     * @param {string?} proofParameters.maxAge Require users to be at most @param proofParameters.maxAge years old
     * @returns {Promise<{result: boolean, cert, params}>} Whether the proof is valid or not, the generated certificate, and the parameters in the proof
     */
    async requestAndVerifyProof(proofParameters) {
        const proof = await this._requestProof(proofParameters);
        return this.verifyProof(proof);
    }
}

module.exports = {
    OutdidSDK
}

// @ts-ignore
window.OutdidSDK = OutdidSDK;
