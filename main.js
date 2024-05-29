// @ts-check
const QRCode = require("qrcode");
const { createHash } = require("crypto");
const body = document.body;
const div = document.createElement("div");
const canvasDiv = document.createElement("div");
const footer = document.createElement("div");
const openLinkBtn = document.createElement("a");
const openLinkBtnDiv = document.createElement("div");
const description = document.createElement("p");
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

const waitText = "Your phone is privately verifying your information";
const descriptionText = "To start, scan this using your iOS or Android phone";

const CANVAS_HEIGHT = window.innerWidth < 800 ? window.innerHeight * 0.4 : 400;
const CANVAS_WIDTH = window.innerWidth < 800 ? window.innerWidth * 0.4 : 400;

const PROOF_PARAMETERS = ["minAge", "maxAge", "nationalityEqualTo", "nationalityNotEqualTo", "uniqueID", "userID", "verifyFirstName", "verifyLastName"];

var API_KEY;

function timestamp() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}T${now.getUTCHours()}:${now.getUTCMinutes()}:${now.getUTCSeconds()}.${now.getUTCMilliseconds()}Z`;
}

function hideQR() {
    try {
        if (outdidQRCode) {
            outdidQRCode.style.display = "none";
        }
        description.innerHTML = descriptionText;
    } catch (_) {}
    try {
        canvasDiv.removeChild(loader);
        canvasDiv.appendChild(canvas);
        canvasDiv.appendChild(footer);
    } catch (_) { }
}

var globalVerificationID;

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
    openLinkBtn.style.fontSize = "12px";
}

footer.setAttribute("id", "outdid-footer");
footer.appendChild(openLinkBtnDiv);
openLinkBtnDiv.appendChild(openLinkBtn);
openLinkBtnDiv.style.marginTop = "10px";

openLinkBtn.innerHTML = "Start verification";
openLinkBtn.setAttribute("class", "btn btn-primary");

canvasDiv.appendChild(description)
canvasDiv.appendChild(canvas);
var outdidQRCode = document.getElementById("outdidQRCode");
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

    #outdid-footer {
        /* display: flex; */
        margin-top: 25px;
        justify-content: center;
        font-family: Arial;
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

function getMobileOperatingSystem() {
    var userAgent = navigator.userAgent;

        // Windows Phone must come first because its UA also contains "Android"
      if (/windows phone/i.test(userAgent)) {
          return "Windows Phone";
      }

      if (/android/i.test(userAgent)) {
          return "Android";
      }

      // iOS detection from: http://stackoverflow.com/a/9039885/177710
      if (/iPad|iPhone|iPod/.test(userAgent)) {
          return "iOS";
      }

      return "unknown";
  }

class OutdidSDK {
    /** @private */
    createCanvas() {
        const os = getMobileOperatingSystem();
        if (os !== "Android" && os !== "iOS") {
            QRCode.toCanvas(canvas, this.proofUrl.toString(), {
                width: CANVAS_WIDTH,
                // height: CANVAS_HEIGHT,
                margin: 0
            }, function (error) {
                if (error) throw error;
            });
            openLinkBtnDiv.style.display = "none";
        } else {
            description.innerHTML = "";
            canvas.height = 0;
            openLinkBtnDiv.style.display = "inline";
        }

        openLinkBtn.href = this.proofUrl.toString();
    }

    /** @private */
    wordFromParameter(parameterName) {
        if (parameterName === "nationalityEqualTo") {
            return "You are from ";
        } else if (parameterName === "nationalityNotEqualTo") {
            return "You are not from ";
        } else if (parameterName === "maxAge") {
            return "You are below ";
        } else if (parameterName === "minAge") {
            return "You are over ";
        } else if (parameterName === "uniqueness") {
            return "You are a unique user of ";
        } else if (parameterName === "verifyFirstName") {
            return "Your given names";
        } else if (parameterName === "verifyLastName") {
            return "Your last name";
        }
        return "";
    }

    /** @private */
    notSharedParameter(parameterName) {
        var notSharedStr = '<li><i class="fa fa-times-circle" style="font-size:20px;color:red;padding-right:8px;vertical-align:middle;"></i>Your ';
        if (parameterName === "nationalityEqualTo") {
            notSharedStr += "exact nationality";
        } else if (parameterName === "age") {
            notSharedStr += "exact age";
        } else if (parameterName === "name") {
            notSharedStr += "name";
        } else if (parameterName === "verifyFirstName") {
            notSharedStr += "exact first name";
        } else if (parameterName === "verifyLastName") {
            notSharedStr += "exact last name";
        } else {
            return "";
        }

        notSharedStr += " won't be shared.</li>\n";
        return notSharedStr;
      }

    /** @private */
    addParametersToDescription(parameters, requester) {
        const requesterHtml = document.getElementById("requester");
        if (requesterHtml) {
            requesterHtml.innerText = requester;
        }
        try {
            var parameterList = document.getElementById("parameter-list");
            if (!parameterList) {
                console.error("Parameter list cannot be found.");
                return;
            }

            if (parameters["verifyFirstName"] !== true) {
                delete parameters["verifyFirstName"];
            }

            if (parameters["verifyLastName"] !== true) {
                delete parameters["verifyLastName"];
            }

            for (const [parameterName, parameter] of Object.entries(parameters)) {
                if (parameter) {
                    const wordFromParameter = this.wordFromParameter(parameterName);
                    if (wordFromParameter !== "")
                        parameterList.innerHTML += '<li class="parameters-list-entry">' + '<i class="fa fa-check-circle" style="font-size:20px;color:green;padding-right:8px;vertical-align:middle;"></i>' + wordFromParameter + (parameterName.includes("Name") ? "" : (parameterName === "uniqueness" ? requester : parameter)) + "</li>\n";
                }
            }

            // handle parameters that whose exact values will not be shared
            if (!("nationalityEqualTo" in parameters)) {
                parameterList.innerHTML += this.notSharedParameter("nationalityEqualTo");
            }

            if (!parameters["verifyFirstName"] &&
                !parameters["verifyLastName"]) {
                parameterList.innerHTML += this.notSharedParameter("name");
            } else if (!parameters["verifyFirstName"]) {
                parameterList.innerHTML += this.notSharedParameter("verifyFirstName");
            } else if (!parameters["verifyLastName"]) {
                parameterList.innerHTML += this.notSharedParameter("verifyLastName");
            }

            parameterList.innerHTML += this.notSharedParameter("age");
        } catch (err) {
            console.error(err);
            return;
        }
    }

    /** @private */
    async registerCallback() {
        this.vcNonce = Array.from({ length: 16 }, () => {
            var rand = Math.floor(Math.random() * 255).toString(16);
            if (Number("0x" + rand) < 0x10) rand = "0" + rand;
            return rand;
        }).join("");
        console.log(timestamp() + " Requesting proof");
        const verificationRequestEndpoint = new URL(this.outdidHandlerUrl);
        verificationRequestEndpoint.pathname += "v1/verification-request";
        verificationRequestEndpoint.searchParams.set("verificationID", globalVerificationID);
        const { qrUrl, parameters, requester } = await fetch(verificationRequestEndpoint)
        .then(async (res) => {
            if (res.status === 403) {
                var body = "";
                try {
                    body = (await res.json()).reason;
                } catch (err) {
                    body = "Forbidden";
                }
                throw new Error(body);
            } else if (res.status === 200) {
                const json = await res.json();
                if (json.status === "expired") {
                    throw new Error("Expired");
                }
                if (json.status === "succeeded" || json.status === "failed") {
                    throw new Error("Already handled")
                }
                if (json.status !== "pending") {
                    throw new Error("Request is not correct");
                }
                const qrUrl = json.qrUrl;
                const parameters = json.parameters;
                const requester = json.requester;
                if (!qrUrl) {
                    throw new Error("Server did not return a correct URL for the QR code");
                }
                return { qrUrl, parameters, requester };
            } else {
                throw new Error("Unexpected response from backend: " + res.status)
            }
        })
        .catch((err) => {
            hideQR();
            throw err;
        });

        this.proofUrl = new URL(qrUrl);

        // add QR code to UI
        this.createCanvas();
        this.addParametersToDescription(parameters, requester);
        outdidQRCode = document.getElementById("outdidQRCode");
        if (outdidQRCode) {
            outdidQRCode.appendChild(canvasDiv);
            outdidQRCode.style.display = "inline";

            const outdidQRCodePending = document.getElementById("outdidQRCodePending");
            if (outdidQRCodePending) {
                outdidQRCodePending.style.display = "none";

                const outdidRequest = document.getElementById("outdidRequest");
                if (outdidRequest) {
                    outdidRequest.style.display = "block";
                }
            }
        }

        return new Promise(async (resolve, reject) => {
            const verificationRequestEndpoint = new URL(this.outdidHandlerUrl);
            verificationRequestEndpoint.pathname += "v1/verification-request";
            verificationRequestEndpoint.searchParams.set("verificationID", globalVerificationID);
            let proofPending = true;
            while (proofPending) {
                await new Promise(resolve => setTimeout(resolve, 4000));
                // if for any reason the proof was cancelled, reject this promise
                if (globalVerificationID == null) {
                    resolve(new Error("Proof cancelled"));
                    return;
                }
                var err = false;
                try {
                    const response = await fetch(verificationRequestEndpoint);
                    let body;
                    if (response.ok) {
                        body = await response.json();
                    } else {
                        err = true;
                        body = await response.text();
                    }

                    if (body.status === "pending") {
                        // ignored, break the promise chain
                        throw Error("ignored");
                    }

                    if (err) {
                        proofPending = false;
                        console.log(timestamp() + " Server returned an unexpected response: " + body);
                        hideQR();
                        reject(new Error(body));
                        return;
                    }
                    if (body.status === "succeeded" || body.status === "failed") {
                        proofPending = false;
                        console.log(timestamp() + " Verification received");
                        resolve({ result: body, verificationID: globalVerificationID });
                        hideQR();
                    } else {
                        proofPending = false;
                        console.log(timestamp() + " Verification failed: " + body.verificationFailed);
                        reject(new Error(body.verificationFailed));
                        hideQR();
                    }
                } catch(err) {
                    if (err.message !== "ignored") {
                        proofPending = false;
                        reject(err);
                        hideQR();
                    }
                }
            }
        });
    }

    /**
     * Construct an instance of the Outdid SDK
     * @param {string} apiKey Your key issued by Outdid
     * @param {string} verificationID Request ID returned after registering the verification request with Outdid's backend
     */
    constructor(apiKey, verificationID) {
        this.proofUrl = new URL("https://request.outdid.io/proof");
        this.outdidHandlerUrl = new URL("https://api.outdid.io");
        globalVerificationID = verificationID;

        if (apiKey !== undefined) {
            API_KEY = apiKey;
        }
    }

    /**
     * Request a proof generated from Outdid's mobile app
     * @param {Object} proofParameters The required proof parameters that should be valid for the requested user
     * @param {string?} proofParameters.userID Specify an optional user ID that will be included in the generated verifiable credential for the verified user
     * @param {boolean?} proofParameters.uniqueID Specify whether to generate a user ID unique for your use-case
     * @param {string?} proofParameters.nationalityEqualTo Require users to be of a specific nationality
     * @param {string?} proofParameters.nationalityNotEqualTo Require users to not be of a specific nationality
     * @param {string?} proofParameters.minAge Require users to be at least @param proofParameters.minAge years old
     * @param {string?} proofParameters.maxAge Require users to be at most @param proofParameters.maxAge years old
     * @param {boolean?} proofParameters.verifyFirstName Include the user's first name or names from their document in the proof
     * @param {boolean?} proofParameters.verifyLastName Include the user's last name from their document in the proof
     * @returns {Promise} A `Promise` that is fulfilled when the proof is done on the app
     */
    async requestProof() {
        const proof = await this._requestProof();
        return proof;
    }

    /** @private */
    _requestProof() {
        const promise = this.registerCallback();

        // set a timeout that will cancel the request after some time
        // (which will most likely happen if the server is not reachable, or its
        // cache has been cleared before the frontend was able to reach it)
        // this.requestExpirationTimeout = setTimeout(() => {
        //     var throwErr = true;
        //     try {
        //         cancelProof();
        //     } catch (_) {
        //         throwErr = false;
        //     }

        //     if (throwErr) {
        //         throw new Error("Proof not received within timeout. Please check your network connection and try again later.");
        //     }
        // }, CANCEL_PROOF_AFTER_MS);
        // timeout = this.requestExpirationTimeout;

        // promise.then(() => {
        //     try {
        //         clearTimeout(this.requestExpirationTimeout);
        //     } catch (err) {
        //         console.error("err: ", err);
        //     }
        // }).catch((err) => {
        //     clearTimeout(this.requestExpirationTimeout);
        //     throw err;
        // });

        return promise;
    }

    /**
     * Verify the generated proof using Outdid's verifiable credentials
     * @param {string} proof The JWT object returned from `requestProof`
     * @param {Object} proofParameters The required proof parameters that should be valid for the requested user
     * @param {string?} proofParameters.userID Specify an optional user ID that will be included in the generated verifiable credential for the verified user
     * @param {boolean?} proofParameters.uniqueID Specify whether to generate a user ID unique for your use-case
     * @param {string?} proofParameters.nationalityEqualTo Require users to be of a specific nationality
     * @param {string?} proofParameters.nationalityNotEqualTo Require users to not be of a specific nationality
     * @param {string?} proofParameters.minAge Require users to be at least @param proofParameters.minAge years old
     * @param {string?} proofParameters.maxAge Require users to be at most @param proofParameters.maxAge years old
     * @param {boolean?} proofParameters.verifyFirstName Include the user's first name or names from their document in the proof
     * @param {boolean?} proofParameters.verifyLastName Include the user's last name from their document in the proof
     * @param {string} nonce The nonce used to issue the VC credential. It should be returned by the popup window that requests the proof
     * @returns {Promise<{result: boolean, cert, params}>} Whether the proof is valid or not, the generated certificate, and the parameters in the proof
     */
    async verifyProof(proof, proofParameters, nonce) {
        const resolver = new Resolver(getResolver())

        const vp = await verifyPresentation(proof, resolver);
        if (!vp || !vp.verified) {
            throw new Error("Verifiable Presentation is not valid");
        }
        if (vp.payload.nonce !== nonce) {
            throw new Error("Verifiable Presentation nonce is not the same as the generated nonce");
        }
        if (vp.issuer !== "did:web:demo.outdid.io" && vp.issuer !== "did:web:request.outdid.io") {
            throw new Error("Verifiable credential issuer is not correct");
        }
        if (vp.verifiablePresentation.verifiableCredential === undefined) {
            throw new Error("Verifiable credential is not defined.");
        }
        if (vp.verifiablePresentation.verifiableCredential.length !== 1) {
            throw new Error("Incorrect number of verifiable credentials: " + vp.verifiablePresentation.verifiableCredential.length);
        }
        var params = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.proofParameters;
        const appID = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.appID;
        const userID = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.userID;
        const uniqueID = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.uniqueID;
        const proofVerified = utils.verifyParameters(proofParameters, params, appID, userID);
        if (appID != "") {
            params = {...params, appID, uniqueID};
        }
        if (userID != "") {
            params = {...params, userID};
        }
        // can get unique user ID from vp.verifiablePresentation.verifiableCredential[0].credentialSubject.uniqueID
        return { result: proofVerified, cert: vp, params: params };
    }

    /**
     * Verify a verifiable credential.
     * @param {string} vc Verifiable credential to be verified.
     * @returns {Promise<{ valid: boolean, issuedAt: string, issuedBy: string, verifiedParameters: object}>} asdf
     */
    async verifyVC(vc) {
        const resolver = new Resolver(getResolver())
        const vp = await verifyPresentation(vc, resolver);

        if (!vp || !vp.verified) {
            throw new Error("Verifiable Presentation is not valid");
        }

        if (vp.verifiablePresentation.verifiableCredential === undefined) {
            throw new Error("Verifiable credential is not defined.");
        }
        if (vp.verifiablePresentation.verifiableCredential.length !== 1) {
            throw new Error("Incorrect number of verifiable credentials: " + vp.verifiablePresentation.verifiableCredential.length);
        }

        var verifiedParameters = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.proofParameters;
        const appID = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.appID;
        const userID = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.userID;
        const uniqueID = vp.verifiablePresentation.verifiableCredential[0].credentialSubject.uniqueID;
        const issuedAt = vp.verifiablePresentation.verifiableCredential[0].issuanceDate;
        if (issuedAt === undefined) {
            throw new Error("Missing issuance date");
        }
        if (appID != "") {
            verifiedParameters = {...verifiedParameters, appID, uniqueID};
        }
        if (userID != "") {
            verifiedParameters = {...verifiedParameters, userID};
        }

        return { valid: vp.verified, issuedAt, issuedBy: vp.issuer, verifiedParameters};
    }

    /**
     * Return a readable string describing what the proof parameters verify.
     * @param {Object} parameters The parameters that are verified in the proof generated by the app.
     * @returns {string} A readable sentence describing what each parameter is and represents.
     */
    getParameterString(parameters) {
        var verifiedString = "The submitted verification ensures that: </br><ul>";
        if (parameters.nationalityEqualTo !== undefined) {
            verifiedString += "<li> The user is a citizen of " + parameters.nationalityEqualTo + "</li>";
        }
        if (parameters.nationalityNotEqualTo !== undefined) {
            verifiedString += "<li>The user is not a citizen of " + parameters.nationalityNotEqualTo + "</li>";
        }
        if (parameters.maxDob !== undefined) {
            verifiedString += "<li>The user was born before " + parameters.maxDob + "</li>";
        }
        if (parameters.minDob !== undefined) {
            verifiedString += "<li>The user was born after " + parameters.minDob + "</li>";
        }
        if (parameters.firstName !== undefined) {
            verifiedString += "<li>The user's first name(s) are " + parameters.firstName + "</li>";
        }
        if (parameters.lastName !== undefined) {
            verifiedString += "<li>The user's last name is " + parameters.lastName + "</li>";
        }
        if (parameters.userID !== undefined) {
            verifiedString += "<li>The provided user identifier for this particular user is " + parameters.userID + "</li>";
        }
        if (parameters.appID != undefined && parameters.uniqueID !== undefined) {
            verifiedString += "<li>The user has a unique and anonymized identifier, which is " + createHash("sha256").update(parameters.uniqueID.join("")).digest().toString("hex") + ".</li>";
        }
        verifiedString += "</ul>";
        return verifiedString;
    }

    /**
     * Request and verify a proof generated from Outdid's mobile app
     * @param {Object} proofParameters The required proof parameters that should be valid for the requested user
     * @param {string?} proofParameters.userID Specify an optional user ID that will be included in the generated verifiable credential for the verified user
     * @param {boolean?} proofParameters.uniqueID Specify whether to generate a user ID unique for your use-case
     * @param {string?} proofParameters.nationalityEqualTo Require users to be of a specific nationality
     * @param {string?} proofParameters.nationalityNotEqualTo Require users to not be of a specific nationality
     * @param {string?} proofParameters.minAge Require users to be at least @param proofParameters.minAge years old
     * @param {string?} proofParameters.maxAge Require users to be at most @param proofParameters.maxAge years old
     * @param {boolean?} proofParameters.verifyFirstName Include the user's first name or names from their document in the proof
     * @param {boolean?} proofParameters.verifyLastName Include the user's last name from their document in the proof
     * @returns {Promise<{result: boolean, cert, params}>} Whether the proof is valid or not, the generated certificate, and the parameters in the proof
     */
    async requestAndVerifyProof(proofParameters) {
        const proof = await this._requestProof();
        return this.verifyProof(proof, proofParameters, this.vcNonce ?? "");
    }
}

module.exports = {
    OutdidSDK
}

// @ts-ignore
window.OutdidSDK = OutdidSDK;
