const { ManagementClient } = require('auth0')
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');

const {
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  AUTH0_AUDIENCE,
  CLIENT_URL
} = process.env

if (!AUTH0_DOMAIN) throw new Error("AUTH0_DOMAIN isn't defined")
if (!AUTH0_CLIENT_ID) throw new Error("AUTH0_CLIENT_ID isn't defined")
if (!AUTH0_CLIENT_SECRET) throw new Error("AUTH0_CLIENT_SECRET isn't defined")
if (!AUTH0_AUDIENCE) throw new Error("AUTH0_AUDIENCE isn't defined")
/*
 * This is completely intended for internal use and not to be exposed via route or similar.
 */

/**
 * @type import('auth0').ManagementClientOptions
 */
const options = {
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
  audience: AUTH0_AUDIENCE
};

const managementClient = new ManagementClient(options);

/**
 * Depends on weather we're storing the password or not.
 * Not needed right now
 *
 *
 * @param {String} auth0UserId
 * @returns {Object}
 */
exports.createPasswordChangeTicket = async (auth0UserId) => await managementClient
  // @link: https://auth0.com/docs/api/management/v2#!/Tickets/post_password_change
  .createPasswordChangeTicket({
    result_url: CLIENT_URL,
    user_id: auth0UserId,
  });

/**
 * Updates as users password at auth0
 * @param {String} auth0UserId
 * @param {String} newPassword
 * @returns Auth0 user
 */
exports.updateUser = async function changePassword(auth0UserId, newPassword) {
  // @gmussi Do we need to trigger an event here?
  return managementClient.updateUser({ id: auth0UserId }, { password: newPassword })
}

/**
 *
 * @param {String} wfairUserId MongoDb user id
 * @param {Object} userData
 * @param {string} userData.email
 * @param {string} userData.password
 * @param {string} userData.phoneNumber
 * @returns
 */
exports.createUser = async function (wfairUserId, userData) {
  return managementClient.createUser({
    connection: process.env.AUTH0_CONNECTION_ID,
    email: userData.email,
    password: userData.password,
    email_verified: false,
    phone_number: userData.phoneNumber,
    phone_verified: false,
    user_metadata: {
      // this reflects our own user mongoDB user Id
      wfairUserId,
    },
  })
}

/**
 * Deletes a user on Auth0
 * @param {String} auth0UserId
 * @returns void
 */
exports.deleteUser = async function (auth0UserId) {
  return managementClient.deleteUser({ id: auth0UserId })
}
/**
 * Authorization middleware. When used, the
 * Access Token must exist and be verified against
 * the Auth0 JSON Web Key Set.
 * The middleware doesn't check if the token has the sufficient scope to access
 * the requested resources!
 */

exports.checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and
  // the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  aud: AUTH0_AUDIENCE,
  issuer: [`https://${AUTH0_DOMAIN}/`],
  algorithms: ['RS256'],
});

// TODO Let's see if we want the work with scopes here
exports.checkScopes = jwtAuthz(['read:messages']);
