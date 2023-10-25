# Outdid SDK

Outdid provides an SDK for private identity verification that can be integrated into any webpage using only html and javascript. You can request any combination of the supported [proof parameters](#optional-proof-parameters) and the SDK with generate a QR code that can be scanned by [Outdid's mobile app](https://outdid.io/download) and used to generate a verifiable proof that the information requested is correct for the document scanned by the app.

In order to use the SDK, you can use our SDK CDN by including this in your html file:

```html
<script src="https://cdn.outdid.io/sdk.js"></script>
```

Or you can compile a build yourself with `npm run build` and include it in your html file like so:

```html
<script src="outdid.js"></script>
```

This allows you to create a `const outdid = new OutdidSDK(<API_KEY>);` anywhere in the file.

In order to request and verify a proof, you can either use the `sdk.requestAndVerifyProof(proofParameters)` or if you want to have access to the generated `proof`, you can use:

```js
outdid.requestProof(proofParameters).then((proof) => outdid.verifyProof(proof));
```

You can check the [./index.html](./index.html) file for a very simple html page that uses the OutDID SDK.

### Optional proof parameters

Depending on what information you want to verify from your customers, you can use the following parameters:

| Field Name              | Description                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `nationalityEqualTo`    | Require users to be of the specified nationality                                                            |
| `nationalityNotEqualTo` | Require users to not be of the specified nationality                                                        |
| `minAge`                | Require users to be older than the specified age                                                            |
| `maxAge`                | Require users to be younger than the specified age                                                          |
| `appID`                 | Specify the ID of the application requesting the proof. Users will have unique identifiers based on this ID |

### Error handling

Errors that can be expected to be thrown by the SDK that need to be handled include:

- The proven parameters differ from what was requested
- No proof parameters have been specified when requesting a proof
- Proof cannot be verified because of an error connecting to the chain, where the verifier smart contracts should be deployed
- The format of the submitted proof is not correct
- The proof parameters are not correct (for example the nationality is not a valid country)

### Verification

#### Zero-Knowledge Proofs

Outdid is using novel zero-knowledge proof technology [link needed] to verify that the information requested from your users is correct without sharing any other personal information. All of this is happening in the background, so you can focus only on working with this information.

#### W3C credentials

After verifying the requested personal information is correct, Outdid generates a [W3C verifiable credential](https://www.w3.org/TR/vc-data-model/) that includes the requested parameters. Fundamentally, this credential is a JWT token signed by us that only has a specific format. The public key needed for the verification can be found here: https://request.outdid.io/.well-known/did.json.
