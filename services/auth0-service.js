const { ManagementClient } = require('auth0')
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, CLIENT_URL } = process.env

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
};

const managementClient = new ManagementClient(options);

/**
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

exports.createUser = managementClient.createUser;
exports.deleteUser = managementClient.deleteUser;
/**
 * Authorization middleware. When used, the
 * Access Token must exist and be verified against
 * the Auth0 JSON Web Key Set
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
  audience: 'YOUR_API_IDENTIFIER',
  issuer: [`https://${AUTH0_DOMAIN}`],
  algorithms: ['RS256']
});
exports.checkScopes = jwtAuthz(['read:messages']);
