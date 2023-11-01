# Outdid SDK

Outdid provides an SDK for private identity verification that can be integrated into any webpage using only html and javascript. You can request any combination of the supported [proof parameters](#optional-proof-parameters) and the SDK will generate a QR code that can be scanned by [Outdid's mobile app](https://outdid.io/download) and used to generate a verifiable proof that the information requested is correct for the document scanned by the app.

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

You can check the [./index.html](./index.html) file for a very simple html page that uses the Outdid SDK.

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
