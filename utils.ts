import iso from 'iso-3166-1';

export function checkMinAgeValid(minAge: number, maxDob: string): boolean {
  const date = new Date();
  const year = date.getFullYear();
  const maxDobYear = parseInt(maxDob.split("/")[2]);

  return (year - maxDobYear) >= minAge;
}

export function checkMaxAgeValid(maxAge: number, minDob: string): boolean {
  const date = new Date();
  const year = date.getFullYear();
  const minDobYear = parseInt(minDob.split("/")[2]);

  return (year - minDobYear) <= maxAge;
}

export function verifyParameters(requestedParameters: any, parametersFromProof: any, appID: string, userID: string) {
  if (requestedParameters === undefined) {
    throw new Error("Proof parameters have not been set up correctly");
  }

  if (requestedParameters.appID) {
    if (!appID) {
      throw new Error("App ID is not set in the proof correctly but is expected");
    }
    if (requestedParameters.appID !== appID) {
      throw new Error(`App ID from proof is not the same as required app ID: ${appID} vs ${requestedParameters.appID}`);
    }
  }

  if (requestedParameters.userID) {
    if (!userID) {
      throw new Error("Optional user ID is not set in the proof correctly but is expected");
    }
    if (requestedParameters.userID !== userID) {
      throw new Error(`Optional user ID from proof is not the same as required user ID: ${userID} vs ${requestedParameters.userID}`);
    }
  }

  if (requestedParameters.nationalityEqualTo || requestedParameters.nationalityNotEqualTo) {
    var nationalityEquality = requestedParameters.nationalityEqualTo ? "nationalityEqualTo" : "nationalityNotEqualTo"
    var nationality;
    if (requestedParameters[nationalityEquality].length == 2) {
      nationality = iso.whereAlpha2(requestedParameters[nationalityEquality]);
    } else if (requestedParameters[nationalityEquality].length == 3) {
      nationality = iso.whereAlpha3(requestedParameters[nationalityEquality]);
    } else {
      nationality = iso.whereCountry(requestedParameters[nationalityEquality]);
    }
    if (nationality === undefined) {
      throw new Error("Nationality cannot be converted to iso alpha 3 code");
    }
    const nationalityAlpha3 = nationality.alpha3 === "DEU" ? "D<<" : nationality.alpha3;
    if (parametersFromProof[nationalityEquality] !== nationalityAlpha3){
      throw new Error(`Nationality equality cannot be verified: ${parametersFromProof[nationalityEquality]} vs ${nationalityAlpha3}`);
    }
  }

  if (requestedParameters.minAge && !checkMinAgeValid(requestedParameters.minAge, parametersFromProof.maxDob)) {
    throw new Error(`Max date of birth from the proof does not verify the required min age: ${parametersFromProof.maxDob} vs ${requestedParameters.minAge}`);
  }

  if (requestedParameters.maxAge && !checkMaxAgeValid(requestedParameters.maxAge, parametersFromProof.minDob)) {
    throw new Error(`Min date of birth from the proof does not verify the required max age: ${parametersFromProof.minDob} vs ${requestedParameters.maxAge}`);
  }

  return true;
}