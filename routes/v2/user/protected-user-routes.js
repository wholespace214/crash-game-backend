const router = require('express').Router();

const userServiceV2 = require('../../../services/user-service-v2');

router.get('/get-all', userServiceV2.getAll);

module.exports = router;
