const { CognitoJwtVerifier } = require("aws-jwt-verify");

let verifier; // created once, reused while the Lambda stays warm

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: "id",
      clientId: process.env.COGNITO_CLIENT_ID,
    });
  }
  return verifier;
}

// Throws if the token is forged, expired, or from a different pool/app
async function verifyToken(token) {
  const payload = await getVerifier().verify(token);
  return {
    userId: payload.sub,
    username: payload["cognito:username"],
    email: payload.email,
  };
}

module.exports = { verifyToken };