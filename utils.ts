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

export function verifyParameters(requestedParameters: any, parametersFromProof: any, appID: string) {
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

  if (requestedParameters.nationality && requestedParameters.checkNationality != "0") {
    var nationality;
    if (requestedParameters.nationality.length == 2) {
      nationality = iso.whereAlpha2(requestedParameters.nationality);
    } else if (requestedParameters.nationality.length == 3) {
      nationality = iso.whereAlpha3(requestedParameters.nationality);
    } else {
      nationality = iso.whereCountry(requestedParameters.nationality);
    }
    if (nationality === undefined) {
      throw new Error("Nationality cannot be converted to iso alpha 3 code");
    }
    const nationalityAlpha3 = nationality.alpha3 === "DEU" ? "D<<" : nationality.alpha3;
    if ((requestedParameters.checkNationality !== 0 && requestedParameters.checkNationality !== 2) && parametersFromProof.nationality !== nationalityAlpha3) {
      throw new Error(`Nationality from proof is not the same as required nationality: ${parametersFromProof.nationality} vs ${nationalityAlpha3}`);
    }
  }

  if ((requestedParameters.checkNationality !== undefined && (requestedParameters.checkNationality !== parametersFromProof.checkNationality && requestedParameters.checkNationality !== 0))
    || (requestedParameters.checkNationality === undefined && parametersFromProof.checkNationality !== 1)) {
    throw new Error(`Check Nationality from proof is not the same as required check nationality: ${parametersFromProof.checkNationality} vs ${requestedParameters.checkNationality}`);
  }

  if (requestedParameters.minAge && !checkMinAgeValid(requestedParameters.minAge, parametersFromProof.maxDob)) {
    throw new Error(`Max date of birth from the proof does not verify the required min age: ${parametersFromProof.maxDob} vs ${requestedParameters.minAge}`);
  }

  if (requestedParameters.maxAge && !checkMaxAgeValid(requestedParameters.maxAge, parametersFromProof.minDob)) {
    throw new Error(`Min date of birth from the proof does not verify the required max age: ${parametersFromProof.minDob} vs ${requestedParameters.maxAge}`);
  }

  return true;
}