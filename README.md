# Outdid API

Outdid provides a verification API together with an minimal SDK that can help you in verifying the result from the API.

First, you need to initialize a verification by making an HTTP POST request to https://api.outdid.io/initReq and pass the following HTTP parameters:

| parameter name | parameter type                  | description                                                                                                                                                                                                                                                                    |
| -------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reqfrom`      | query string parameter          | Your public identifier issued by Outdid                                                                                                                                                                                                                                        |
| `secret`       | query string parameter          | Your secret issued by Outdid                                                                                                                                                                                                                                                   |
| `callback`     | HTTP POST body string parameter | Optional callback URL, where the user will be redirected to after the verification is complete. This can be used to indicate to your backend that the verification is complete. Alternatively, if the parameter is not set, the result will be sent to the requesting frontend |
| `vcNonce`      | HTTP POST body string parameter | A random nonce used in the generation of a VC credential with the requested information                                                                                                                                                                                        |
| `parameters`   | HTTP POST body object parameter | An object containing any combination of [these parameters](#optional-proof-parameters)                                                                                                                                                                                         |

If the initialization request succeeded, the endpoint will return a request ID and an Auth URL as a JSON object with `requestID` and `authUrl` parameters respectively.

Then, you need to open a popup window that should display `authUrl` to the user. You can use the following code segment as a template:

```javascript
const width = 600;
const height = 800;
const left = window.screen.width / 2 - width / 2;
const top = window.screen.height / 2 - height / 2;

const popup = window.open(
  response.authUrl,
  undefined,
  `popup, width=${width}, height=${height}, left=${left}, top=${top}`
);
```

Then, the user will have to perform an authentication in the popup window to prove the requested parameters are valid for their passport. Once the verification is complete, the user will be redirected to the `callback` URL indicating the verification is complete.

After completing verification, your backend can request the result by making an authenticated request to https://api.outdid.io/proofResult with `reqfrom`, `secret` and `requestID` as query string parameters like so:

```
https://api.outdid.io/proofResult?reqfrom=pk_<your_identifier>&secret=<your_secret>&requestID=1234<...>abcd
```

The response will be a JSON object with `proofResult` parameter if everything went okay. Otherwise, if for some reason the verification submitted by the user was incorrect, the reason will be returned in `verificationFailed`. Other common responses include HTTP response code `400` in case the verification request was cancelled or expired, or `304` if the verification is still pending and there is no result yet to be shared.

Assuming the verification was successful, the result returned in `proofResult` is a [Verifiable Credential JWT object](#w3c-credentials).
You can use the following code segment to verify the VC yourself:

```javascript
import { Resolver } from "did-resolver";
import { getResolver } from "web-did-resolver";
import { verifyPresentation } from "did-jwt-vc";

const resolver = new Resolver(getResolver());
const vp = await verifyPresentation(proofResult, resolver);

if (
  vp &&
  vp.verified &&
  vp.issuer == "did:web:request.outdid.io" &&
  vp.payload.nonce === vcNonce &&
  vp.verifiablePresentation.verifiableCredential &&
  vp.verifiablePresentation.verifiableCredential.length === 1 &&
  typeof vp.verifiablePresentation.verifiableCredential[0]?.credentialSubject
    ?.userID === "string" &&
  vp.verifiablePresentation.verifiableCredential[0].credentialSubject.userID.toLowerCase() ===
    payload.address.toLowerCase()
) {
  // vp.verifiablePresentation.verifiableCredential[0]?.credentialSubject?.userID contains the optional userID
  // if you have requested a unique personal ID, you can find it in vp.verifiablePresentation.verifiableCredential[0]?.credentialSubject?.uniqueID
  // the other requested parameters are in vp.verifiablePresentation.verifiableCredential[0]?.credentialSubject?.proofParameters
  // you can verify that they are the same as the parameters you requested in `parameters`

  valid = true;
}
```

Additionally, you can also use the Outdid SDK to perform this verification with:

```javascript
const outdid = new OutdidSDK(reqfrom, requestID);
outdid
  .verifyProof(proofResult, parameters, vcNonce)
  .then((result) => {
    // handle successfully verified user data
    // you can get the verified parameters from result.params
  })
  .catch((e) => {
    // handle unsuccessful verification with e.message containing the reason what failed
  });
```

In the future you will also be able to generate the popup with the Outdid SDK.

# Outdid SDK

Outdid provides a javascript SDK for helping you with the use of the API. It can be integrated into any webpage using only html and javascript, and in any Node-based webapp. You can verify any combination of the supported [proof parameters](#optional-proof-parameters), which will be requested by your users with the help of [Outdid's mobile app](https://outdid.io/download), which is used to generate a verifiable proof that the information requested is correct for the document scanned by the app.

In order to use the SDK, you can use our SDK CDN by including this in your html file:

```html
<script src="https://cdn.outdid.io/sdk.js"></script>
```

This allows you to create a `const outdid = new OutdidSDK(<public API_KEY>, <request ID>);` anywhere in the file.

In order to verify a proof, you can either use the `outdid.verifyProof(proofResult, requestedProofParameters, vcNonce)`.

You can check the [Outdid demo verification page](https://demo.outdid.io/) for a very simple html page that uses the Outdid API and SDK.

### Optional proof parameters

Depending on what information you want to verify from your customers, you can use the following parameters:

| Field Name              | Description                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `nationalityEqualTo`    | Require users to be of the specified nationality                                                              |
| `nationalityNotEqualTo` | Require users to not be of the specified nationality                                                          |
| `minAge`                | Require users to be older than the specified age                                                              |
| `maxAge`                | Require users to be younger than the specified age                                                            |
| `uniqueID`              | Specify whether a unique user identifiers should be generated as a Sybil-resilient proof of personhood        |
| `userID`                | Specify a user identifier that you can use to associate the issued verifiable credential to any of your users |

### Error handling

Common errors that can be expected to be thrown by the SDK include:

- No proof parameters have been specified when requesting a proof
- The proof parameters are not correct (for example the nationality is not a valid country)

### Verification

#### Zero-Knowledge Proofs

Outdid is using novel zero-knowledge proof technology [link needed] to verify that the information requested from your users is correct without sharing any other personal information. All of this is happening in the background, so you can focus only on working with this information.

#### W3C credentials

After verifying the requested personal information is correct, Outdid generates a [W3C verifiable credential](https://www.w3.org/TR/vc-data-model/) that includes the requested parameters. Fundamentally, this credential is a JWT token signed by us that has the following format:

```json
{
  "vp": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "type": ["VerifiablePresentation"],
    "verifiableCredential": [
      // jwt encoded
      {
        "vc": {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          "type": ["VerifiableCredential"],
          "credentialSubject": {
            "proofParameters": {
              // the parameters that were requested
              // ...
            },
            "appID": "...", // the ID unique to you
            "uniqueID": [...], // the generated user ID, unique for your use-case
            "userID": "...", // user identifier that you might want to associate with your user
          }
        },
        "sub": "did:web:request.outdid.io",
        "iss": "did:web:request.outdid.io"
      }
    ]
  },
  "nonce": "d742fc833ba2cc8e4cb80d37e6fe84910b2c0a90e36d614efbe1ee35ba03488d",
  "iss": "did:web:request.outdid.io"
}
```

You can verify the generated verifiable credential using https://github.com/decentralized-identity/did-jwt-vc for node.js based backends. For more information you can check the `verifyProof()` function in `main.js` for an example on how to verify the issued credential.

In case you want to manually verify the credential, it is a simple JWT token, which you can verify using your JWT library of choice. Once you verify the `Verifiable Presentation` object (the JWT returned by `requestProof()`, which structure is shown above), you also need to verify the `verifiableCredential` inside it, which includes the requested parameters.

The public key needed for the verification can be found here: https://request.outdid.io/.well-known/did.json, as part of the DID verifiable credential specification. We are using a DID web identifier (`did:web:request.outdid.io`).
