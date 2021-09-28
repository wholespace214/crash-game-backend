const router = require('express').Router();

const { checkJwt } = require('../services/auth0-service')

router.get('/auth0-showcase', checkJwt, (req, res) => {

  return res.status(200).json({
    foo: "bar",
    super: "secret data",
    timestamp: Date.now()
  });
})

module.exports = router;
