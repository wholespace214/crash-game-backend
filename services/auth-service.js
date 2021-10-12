const jwt = require('jsonwebtoken');

exports.generateJwt = async (user) => jwt.sign({ userId: user.id, phone: user.phone }, process.env.JWT_KEY, { expiresIn: '1h' });
