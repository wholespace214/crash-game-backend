const { validationResult } = require('express-validator');

const userService = require("../services/user-service");
const rewardService = require("../services/reward-service");

const postRewardAnswer = async (req, res, next) => {
    const errors  = validationResult(req);

    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    try {
        const { questionId, answerId } = req.body;

        const user = await userService.getUserById(req.user.id);
        const result = await rewardService.saveReward(questionId, answerId, user._id);

        res.status(201).json({
            id: result._id
        });
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const getQuestions = async (req, res, next) => {
    const questions = await rewardService.listRewards();
    res.status(200).json(questions);
};

exports.getQuestions = getQuestions;
exports.postRewardAnswer = postRewardAnswer;
