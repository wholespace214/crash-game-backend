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
