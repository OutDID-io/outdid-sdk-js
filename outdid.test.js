/**
 * @jest-environment jsdom
 */

const { setImmediate } = require("timers");
window.setImmediate = setImmediate;
require("jsdom-worker");
require("jest-canvas-mock");

// TODO: find a way to not mock it
jest.mock("did-jwt-vc", () => ({ verifyPresentation: () => { } }));
require("./main.js");
const iso = require('iso-3166-1');
const { TextEncoder } = require("util");
global.TextEncoder = TextEncoder
const utils = require("../utils/utils.js");

// socket io setup
const { createServer } = require("http");
const { Server } = require("socket.io");
const { OutdidSDK } = require("./main.js");
const fs = require("fs");
require("dotenv").config()

describe.skip("proof", () => {
    const PORT = 8081;
    const HOST = "127.0.0.1";
    const exampleProof = { "test": "proof" };
    const proofParamsAll = { "appID": "app1", "nationality": "us", "checkNationality": 1, "minAge": 20, "maxAge": 80 };
    const proofParamsOnlyAppIdNationality = { "appID": "1234", "nationality": "bulgaria" };
    var httpServer;
    var serverSocket;
    // variable that keeps track of how many local socket io instances have been setup to
    //  keep track of which ports have been used
    var localIoCount = 0;
    const { proofs, randomProof, proofWithAppID } = readProofs();

    beforeAll((done) => {
        httpServer = createServer(
            function (req, res) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.write('{}');
                res.end();
            }
        );
        io = new Server(httpServer, {
            path: "/socket",
            cors: {
                origin: [`http://${HOST}`, "http://localhost", "null"],
                methods: ["GET", "POST"]
            }
        });
        httpServer.listen(PORT, () => {
            io.on("connection", (socket) => {
                serverSocket = socket;
                socket.on("requestProof", (data) => {
                    if (data === undefined || data.requestID === undefined) {
                        socket.disconnect();
                        return;
                    }
                    setTimeout(() => {
                        socket.emit("proof", JSON.stringify(exampleProof));
                        socket.disconnect();
                    }, 200)
                });

                socket.on("cancelProof", (requestID) => {
                    if (requestID) {
                        socket.disconnect();
                    }
                });
            });
        });

        done();
    });

    afterAll(() => {
        io.close();
        httpServer.close();
    });

    async function testParameters(parameters, urlParameters) {
        const outdid = new OutdidSDK(`http://${HOST}:${PORT}`);
        const spy = jest.spyOn(outdid, "registerCallback");

        await expect(outdid.requestProof(parameters)).resolves.toEqual(exampleProof);
        expect(outdid.proofParameters).toBe(parameters);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0].length).toEqual(1);
        const requestID = spy.mock.calls[0][0];

        expect(outdid.proofUrl.toString()).toEqual(`https://request.outdid.io/proof?${urlParameters !== "" && urlParameters ? urlParameters + "&" : ""}requestID=${requestID}&callback=http%3A%2F%2F${HOST}%3A${PORT}`);
    }

    function readProofs() {
        // read all proofs from the proof directory
        if (!process.env.PROOF_DIR) {
            throw new Error("Please set PROOF_DIR environment variable in .env that points "
                + "to the directory with the proofs generated from generate_proof.js.\n"
                + "Try not to skip the tests that need it, because they are important.");
        }

        const proofDir = process.env.PROOF_DIR;
        var fileNames;
        try {
            fileNames = fs.readdirSync(proofDir);
        } catch (err) {
            throw new Error("The directory in PROOF_DIR cannot be read: " + err);
        }

        var proofs = {};
        // save all proofs from the files to local variables
        for (var file of fileNames) {
            const rawData = fs.readFileSync(`${proofDir}/${file}`).toString();
            const fileNameSplit = file.split("_");
            var circuitName;
            if (file.startsWith("parameters")) {
                circuitName = fileNameSplit.slice(1).join("_");
                if (proofs[circuitName] === undefined) proofs[circuitName] = { "proofContents": [0, 0, 0], "publicContents": [0, 0, 0], "signatureParameters": {} };

                const data = JSON.parse(rawData);
                proofs[circuitName].parameters = data.parameters;
                proofs[circuitName].proofParameters = data.proofParams;
                proofs[circuitName].signatureParameters.tbs = data.tbs;
                proofs[circuitName].signatureParameters.countrySig = data.countrySig;
                proofs[circuitName].signatureParameters.countryMod = data.countryMod;
                proofs[circuitName].signatureParameters.modLocationInTbs = data.modLocationInTbs;
                proofs[circuitName].signatureParameters.cscEncryptionAlg = data.cscSigAlg;
            } else {
                var index = -1;
                const type = fileNameSplit[0];
                const circuit = fileNameSplit[1];
                circuitName = fileNameSplit.slice(2).join("_");
                if (proofs[circuitName] === undefined) proofs[circuitName] = { "proofContents": [0, 0, 0], "publicContents": [0, 0, 0], "signatureParameters": {} };

                if (circuit === "lds") {
                    index = 0;
                }
                else if (circuit === "attrs") {
                    index = 1;
                }
                else if (circuit === "sig") {
                    index = 2;
                }
                else {
                    throw new Error(`Circuit ${circuit} is not expected.`);
                }

                if (type === "proof") {
                    proofs[circuitName].proofContents[index] = rawData;
                } else if (type === "public") {
                    proofs[circuitName].publicContents[index] = rawData;
                } else {
                    throw new Error(`Type ${type} not expected.`);
                }
            }
        }

        const proofValues = Object.values(proofs);

        var proofWithAppID;
        // get the first that has an appID and checkNationality is not 2
        for (var proofThatShouldHaveAppID of proofValues) {
            if (proofThatShouldHaveAppID.proofParameters.appID !== undefined
                && proofThatShouldHaveAppID.proofParameters.checkNationality !== 2) {
                proofWithAppID = proofThatShouldHaveAppID;
                break;
            }
        }

        // get a random proof where nationality is not an invalid country
        var randomProof = proofValues[Math.floor(Math.random() * proofValues.length)];
        while (iso.whereAlpha3(randomProof.proofParameters.nationality) === undefined) {
            randomProof = proofValues[Math.floor(Math.random() * proofValues.length)];
        }


        if (proofWithAppID === undefined) {
            throw new Error("Something has gone wrong with your proof setup. There are no proofs with an appID set.\n"
                + "Please check your generate_proof.js script and try again.");
        }
        return { proofs, randomProof, proofWithAppID };
    }

    test("request proof missing parameters", async () => {
        const outdid = new OutdidSDK();
        expect(outdid.serverHandlerUrl).toEqual("https://request.outdid.io:8080");
        expect(outdid.proofUrl.toString()).toEqual("https://request.outdid.io/proof");
        await expect(outdid.requestProof()).rejects.toThrow(Error);
    });

    test("request proof no parameters", async () => {
        await testParameters({}, "");
    });

    test("request proof all parameters", async () => {
        const minAge = proofParamsAll["minAge"];
        const maxAge = proofParamsAll["maxAge"];
        const nationality = proofParamsAll["nationality"];
        const checkNationality = proofParamsAll["checkNationality"];
        const appID = proofParamsAll["appID"];

        await testParameters(proofParamsAll, `minAge=${minAge}&maxAge=${maxAge}&nationality=${nationality}&checkNationality=${checkNationality}&appID=${appID}`);
    });

    const localIoSetup = (onConnection) => {
        const port = PORT + (++localIoCount);
        const localHttpServer = createServer();
        const localIo = new Server(localHttpServer, {
            path: "/socket",
            cors: {
                origin: [`http://${HOST}`, "http://localhost", "null"],
                methods: ["GET", "POST"]
            }
        });
        localHttpServer.listen(port, () => {
            localIo.on("connection", onConnection);
        });

        return { localIo, port, localHttpServer };

    };
    // needs its own socket io setup to not influence the other tests
    test("simulate too many connections", async () => {
        const { localIo, port, localHttpServer } = localIoSetup((socket) => {
            socket.emit("maxConnectionsReached");
            socket.disconnect();
        });


        const outdid = new OutdidSDK(`http://${HOST}:${port}`);
        await expect(outdid.requestProof(proofParamsAll)).rejects.toThrow("Too many connections. Please try again later.");

        localIo.close();
        localHttpServer.close();
    });

    // also needs its own socket io setup
    test("dom proofStarted", async () => {
        const { localIo, port, localHttpServer } = localIoSetup((socket) => {
            // setup a server socket response that emits proofStarted before submitting the proof
            socket.on("requestProof", async (_) => {
                // div child should have been added
                expect(body.children.length).toEqual(1);
                // get a reference to the dom elements that should be changed
                const div = body.children[0];

                // div should have 3 children: a description, the canvas for the QR code and close button
                expect(div.children).toBeInstanceOf(HTMLCollection);
                expect(div.children.length).toEqual(3);

                const description = div.children[0];
                const canvasDiv = div.children[1];
                expect(canvasDiv.children[0]).toBeInstanceOf(HTMLCanvasElement);

                expect(description.innerHTML).toEqual("Scan this QR code with your mobile phone that has OutDID installed and generate a proof. <br>"
                    + "In order to submit the proof, you will need to be connected to the internet.");
                await new Promise((resolve) => {
                    setTimeout(() => {
                        socket.emit("proofStarted");
                        setTimeout(() => {
                            expect(description.innerHTML).toEqual("Please wait while the proof is generating");
                            // canvas should be changed to the loader
                            expect(canvasDiv.children[0]).toBeInstanceOf(HTMLDivElement);
                            resolve();
                        }, 200);
                    }, 200);
                }).then((_) => {
                    setTimeout(() => {
                        socket.emit("proof", JSON.stringify(exampleProof));
                        socket.disconnect();
                    }, 300);
                });
            });
        });

        // get a reference to the dom elements
        const body = document.getElementsByTagName("body")[0];
        expect(body).toBeDefined();
        expect(body).toBeInstanceOf(HTMLBodyElement);


        const outdid = new OutdidSDK(`http://${HOST}:${port}`);
        // at this point the body should not have any children yet
        expect(body.children.length).toEqual(0);

        await expect(outdid.requestProof(proofParamsAll)).resolves.toEqual(exampleProof);

        localIo.close();
        localHttpServer.close();
    });

    test("empty nationality", async () => {
        await testParameters({ "appID": null, "nationality": "", "checkNationality": "2" }, "");
    });

    test("nationality only whitespace characters", async () => {
        const outdid = new OutdidSDK(`http://${HOST}:${PORT}`);
        await expect(outdid.requestProof({ "nationality": "        ", "checkNationality": "2" })).rejects.toThrow(new Error("Nationality is not a country"));
    });

    test("checkNationality as string", async () => {
        await testParameters({ "nationality": "jam", "checkNationality": "2" }, "nationality=jam&checkNationality=2");
    });

    test("invalid country", async () => {
        const outdid = new OutdidSDK(`http://${HOST}:${PORT}`);
        await expect(outdid.requestProof({ "nationality": "not a real contry", "checkNationality": "2" })).rejects.toThrow(new Error("Nationality is not a country"));
    });

    test("nationality missing but checkNationality defined", async () => {
        await testParameters({ "checkNationality": 1, "appID": "application id" }, "appID=application+id");
    });

    test("nationality without checkNationality", async () => {
        await testParameters({ "nationality": "gb", "appID": "application id" }, "nationality=gb&appID=application+id");
    });

    test("only minAge", async () => {
        await testParameters({ "minAge": 20 }, "minAge=20");
    });

    test("invalid server handler url", () => {
        expect(() => new OutdidSDK("example.com")).toThrow(new Error("Server handler URL is not a valid URL"));
    });

    test("custom server handler url", () => {
        const outdid = new OutdidSDK("http://example.com");
        expect(outdid).toBeInstanceOf(OutdidSDK);
        expect(outdid.serverHandlerUrl).toEqual("http://example.com");
        expect(outdid.proofUrl.toString()).toEqual("https://request.outdid.io/proof");
    });

    test("no proof parameters specified", async () => {
        const outdid = new OutdidSDK(`http://${HOST}:${PORT}`);
        await expect(outdid.requestProof()).rejects.toThrow(new Error("Proof parameters cannot be undefined"));
    });

    test("proof verification", async () => {
        expect(Object.values(proofs).length).toBeGreaterThanOrEqual(2);

        const proof = randomProof;
        var receivedRequestID;

        const { localIo, port, localHttpServer } = localIoSetup((socket) => {
            socket.on("requestProof", (data) => {
                receivedRequestID = data.requestID;
                setTimeout(() => {
                    socket.emit("proof", JSON.stringify(proof));
                    socket.disconnect();
                }, 100)
            });
        });

        const outdid = new OutdidSDK(`http://${HOST}:${port}`);
        const spy = jest.spyOn(outdid, "registerCallback");

        const proofParameters = { nationality: proof.proofParameters.nationality, appID: proof.proofParameters.appID };
        await expect(outdid.requestAndVerifyProof(proofParameters)).resolves.toEqual(true);
        expect(outdid.proofParameters).toBe(proofParameters);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0].length).toEqual(1);
        const requestID = spy.mock.calls[0][0];

        expect(requestID).toEqual(receivedRequestID);

        localIo.close();
        localHttpServer.close();
    });

    test("verify all proofs", async () => {
        var proofID;
        const { localIo, port, localHttpServer } = localIoSetup((socket) => {
            socket.on("requestProof", (data) => {
                receivedRequestID = data.requestID;
                setTimeout(() => {
                    socket.emit("proof", JSON.stringify(proofs[proofID]));
                    socket.disconnect();
                }, 200)
            });
        });

        const outdid = new OutdidSDK(`http://${HOST}:${port}`);

        for (var proof in proofs) {
            proofID = proof;
            // deep copy
            const proofParameters = JSON.parse(JSON.stringify(proofs[proof].proofParameters));
            // one of the proofs is for an invalid nationality
            if (iso.whereAlpha3(proofParameters.nationality) === undefined) {
                await expect(outdid.requestAndVerifyProof(proofParameters)).rejects.toThrow("Nationality is not a country");
            } else {
                await expect(outdid.requestAndVerifyProof(proofParameters)).resolves.toStrictEqual(true);
            }

            // for the proofs with undefined appID, try to set it and expect an exception
            if (proofParameters.appID === undefined) {
                proofParameters.appID = "expected app ID";
                await expect(outdid.requestAndVerifyProof(proofParameters)).rejects.toThrow("An error occurred when trying to verify the proof: App ID is not set in the proof correctly but is expected");
            }
        }

        localIo.close();
        localHttpServer.close();
    });

    test("try to verify a proof with different parameters", async () => {
        const outdid = new OutdidSDK(`http://${HOST}:${PORT}`);
        const spy = jest.spyOn(outdid, "registerCallback");

        const proof = proofWithAppID;
        const proofJson = JSON.stringify(proof);

        spy.mockReturnValue(new Promise((resolve, _) => resolve(proofJson)));

        const generatedProof = await outdid.requestProof(proofParamsAll);
        expect(generatedProof).toStrictEqual(proof);

        await expect(outdid.verifyProof(proofJson)).rejects.toThrow("An error occurred when trying to verify the proof: App ID from proof is not the same as required app ID: 1234 vs app1");
    });

    test("verify proof with full country name", async () => {
        const outdid = new OutdidSDK(`http://${HOST}:${PORT}`);
        const spy = jest.spyOn(outdid, "registerCallback");

        const proof = randomProof;
        const proofJson = JSON.stringify(proof);

        spy.mockReturnValue(new Promise((resolve, _) => resolve(proofJson)));


        // deep copy
        var proofParamsFullCountryName = JSON.parse(JSON.stringify(proof.proofParameters));
        proofParamsFullCountryName["nationality"] = iso.whereAlpha3(proofParamsFullCountryName["nationality"]).country;
        const generatedProof = await outdid.requestProof(proofParamsFullCountryName);
        expect(generatedProof).toStrictEqual(proof);

        await expect(outdid.verifyProof(proofJson)).resolves.toBe(true);
    });

    test("proof not valid format", async () => {
        const outdid = new OutdidSDK();

        jest.spyOn(outdid, "registerCallback").mockReturnValue(new Promise((resolve) => resolve("{}")));
        await outdid.requestProof({});

        await expect(outdid.verifyProof("")).rejects.toThrow("An error occurred when trying to verify the proof: Proof is not valid json. Please update the proof and try again.");
        await expect(outdid.verifyProof("{}")).rejects.toThrow("An error occurred when trying to verify the proof: Invalid proof format: proofContents or publicContents is missing.");
    });

    test("proof parameters not valid or missing for verification", async () => {
        // make a deep copy of the proof as it will be modified later
        const proof = JSON.parse(JSON.stringify(proofWithAppID));

        const outdid = new OutdidSDK();

        jest.spyOn(outdid, "registerCallback").mockReturnValue(new Promise((resolve) => resolve("{}")));
        await outdid.requestProof({});

        outdid.proofParameters = undefined;
        await expect(outdid.verifyProof(JSON.stringify(proof))).rejects.toThrow("An error occurred when trying to verify the proof: Proof parameters have not been set up correctly");

        // remove appID's set bit from the proof, but leave it as a valid ID
        var publicContents = JSON.parse(proof.publicContents[1]);
        publicContents[6] = 0;
        proof.publicContents[1] = JSON.stringify(publicContents);

        outdid.proofParameters = { appID: "app" };
        await expect(outdid.verifyProof(JSON.stringify(proof))).resolves.toEqual(false);

        // make the proof valid again
        publicContents[6] = 1;
        proof.publicContents[1] = JSON.stringify(publicContents);
        outdid.proofParameters = { appID: "1234" };
        await expect(outdid.verifyProof(JSON.stringify(proof))).resolves.toEqual(true);

        // alter one of the proofs, making it invalid
        var proofContents = JSON.parse(proof.proofContents[0]);
        proofContents["pi_a"][0] = (BigInt(proofContents["pi_a"][0]) + 1n).toString();
        proof.proofContents[0] = JSON.stringify(proofContents);
        await expect(outdid.verifyProof(JSON.stringify(proof))).rejects.toThrow("Proof format is not valid. Please change it and try again.");

        // invalid provider
        await expect(outdid.verifyProof(JSON.stringify(randomProof), { mainContract: "0x0000000000000000000000000000000000000000", chainRpc: "https://example" })).rejects.toThrow("There was a problem reaching the web3 provider.");
        await expect(outdid.verifyProof(JSON.stringify(randomProof), { mainContract: "0x0000000000000000000000000000000000000000" })).rejects.toThrow("An error occurred when trying to verify the proof:");

        // remove the parameters from the proof
        const savedParameters = proof.parameters;
        delete proof.parameters;
        await expect(outdid.verifyProof(JSON.stringify(proof))).rejects.toThrow("An error occurred when trying to verify the proof: Invalid proof format: parameters are missing.");

        proof.parameters = savedParameters;

        delete proof.signatureParameters.tbs;
        await expect(outdid.verifyProof(JSON.stringify(proof))).rejects.toThrow("An error occurred when trying to verify the proof: Invalid proof format: signature parameters are missing or do not have a correct format.");
    });

    test("different formats of nationality in proof parameters", async () => {
        const outdid = new OutdidSDK(`http://${HOST}:${PORT}`);
        const spy = jest.spyOn(outdid, "registerCallback");

        const proof = randomProof;
        const proofJson = JSON.stringify(proof);

        spy.mockReturnValue(new Promise((resolve, _) => resolve(proofJson)));
        var proofParametersNationalityAlpha2 = { "appID": proof.proofParameters.appID, "nationality": iso.whereAlpha3(proof.proofParameters.nationality).alpha2.toLocaleLowerCase() };
        var proofParametersNationalityAlpha3 = { "appID": proof.proofParameters.appID, "nationality": proof.proofParameters.nationality.toLowerCase() };
        var proofParametersNationalityCountry = { "appID": proof.proofParameters.appID, "nationality": iso.whereAlpha3(proof.proofParameters.nationality).country.toUpperCase() };

        // iso2
        await outdid.requestProof(proofParametersNationalityAlpha2);
        await expect(outdid.verifyProof(proofJson)).resolves.toBe(true);

        // iso3
        await outdid.requestProof(proofParametersNationalityAlpha3);
        await expect(outdid.verifyProof(proofJson)).resolves.toBe(true);

        // whole country
        await outdid.requestProof(proofParametersNationalityCountry);
        await expect(outdid.verifyProof(proofJson)).resolves.toBe(true);
    });

    test("proof different from parameters", async () => {
        const outdid = new OutdidSDK();
        const spy = jest.spyOn(outdid, "registerCallback");

        const proof = proofWithAppID;
        const proofJson = JSON.stringify(proof);

        spy.mockReturnValue(new Promise((resolve, _) => resolve(proofJson)));
        const proofParametersInvalidAppID = { "appID": proof.proofParameters.appID + "asdf", "nationality": proof.proofParameters.nationality };
        const proofParametersInvalidNationality = { "appID": proof.proofParameters.appID, "nationality": proof.proofParameters.nationality === "USA" ? "bg" : "us" };
        const proofParametersInvalidCheckNationality = { "appID": proof.proofParameters.appID, "nationality": proof.proofParameters.nationality, checkNationality: 2 };
        const proofParametersInvalidMinAge = { "appID": proof.proofParameters.appID, "minAge": (parseInt(proof.proofParameters.actualAge) + 2).toString() };
        const proofParametersInvalidMaxAge = { "appID": proof.proofParameters.appID, "maxAge": (parseInt(proof.proofParameters.actualAge) - 2).toString() };

        // app ID not correct
        await outdid.requestProof(proofParametersInvalidAppID);
        await expect(outdid.verifyProof(proofJson)).rejects.toThrow(`An error occurred when trying to verify the proof: App ID from proof is not the same as required app ID: ${proof.proofParameters.appID} vs ${proofParametersInvalidAppID.appID}`);

        // nationality not correct
        await outdid.requestProof(proofParametersInvalidNationality);
        await expect(outdid.verifyProof(proofJson)).rejects.toThrow(`An error occurred when trying to verify the proof: Nationality from proof is not the same as required nationality: ${proof.proofParameters.nationality} vs ${iso.whereAlpha2(proofParametersInvalidNationality.nationality).alpha3}`);

        // checkNationality not correct
        await outdid.requestProof(proofParametersInvalidCheckNationality);
        await expect(outdid.verifyProof(proofJson)).rejects.toThrow(`An error occurred when trying to verify the proof: Check Nationality from proof is not the same as required check nationality: ${proof.proofParameters.checkNationality} vs ${proofParametersInvalidCheckNationality.checkNationality}`);

        // min age not correct
        await outdid.requestProof(proofParametersInvalidMinAge);
        await expect(outdid.verifyProof(proofJson)).rejects.toThrow(`An error occurred when trying to verify the proof: Max date of birth from the proof does not verify the required min age: ${utils.dateToString(new Date(proof.proofParameters.maxDob))} vs ${proofParametersInvalidMinAge.minAge}`);

        // max age not correct
        await outdid.requestProof(proofParametersInvalidMaxAge);
        await expect(outdid.verifyProof(proofJson)).rejects.toThrow(`An error occurred when trying to verify the proof: Min date of birth from the proof does not verify the required max age: ${utils.dateToString(new Date(proof.proofParameters.minDob))} vs ${proofParametersInvalidMaxAge.maxAge}`);
    });

    test("verifyProof unexpected inputs", async () => {
        const outdid = new OutdidSDK();
        const spy = jest.spyOn(outdid, "registerCallback");

        spy.mockReturnValue(new Promise((resolve, _) => resolve("{}")));

        // app ID not correct
        await outdid.requestProof(proofParamsAll);
        await expect(outdid.verifyProof("", {})).rejects.toThrow("Main verifier contract address cannot be undefined");
        await expect(outdid.verifyProof("", { mainContract: "contract" })).rejects.toThrow("Given address \"contract\" is not a valid Ethereum address.");
    });

    test("dom cancel proof", (done) => {
        window.confirm = jest.fn().mockReturnValue(true);
        var requestID;
        const { localIo, port, localHttpServer } = localIoSetup((socket) => {
            socket.on("requestProof", async (_) => {
                await new Promise((resolve) => {
                    setTimeout(() => {
                        socket.emit("proofStarted");
                        setTimeout(() => {
                            document.getElementsByTagName("body")[0].children[0].click();
                            expect(window.confirm).toHaveBeenCalledTimes(1);
                            resolve();
                        }, 200);
                    }, 200);
                });
            });

            socket.on("cancelProof", (receivedRequestID) => {
                expect(receivedRequestID).toEqual(requestID);
                localIo.close();
                localHttpServer.close();
                done();
            });
        });

        const outdid = new OutdidSDK(`http://${HOST}:${port}`);
        const spy = jest.spyOn(outdid, "registerCallback");

        expect(outdid.requestAndVerifyProof(proofParamsOnlyAppIdNationality)).resolves.toEqual(true);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0].length).toEqual(1);
        requestID = spy.mock.calls[0][0];
    });

});
