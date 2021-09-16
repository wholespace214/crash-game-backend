const router = require('express').Router();

const userServiceV2 = require('../../../services/user-service-v2');

router.post('/create', userServiceV2.createUser);

module.exports = router;
