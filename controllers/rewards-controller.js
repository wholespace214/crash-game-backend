const { validationResult } = require('express-validator');

const userService = require("../services/user-service");
const lotteryService = require("../services/lottery-service");

const postLotteryAnswer = async (req, res, next) => {
    const errors  = validationResult(req);

    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    try {
        const { questionId, answerId } = req.body;

        const user = await userService.getUserById(req.user.id);
        const openLotteries = await lotteryService.listLotteriesForUser(req.user.id);

        if(!openLotteries.map(({_id}) => _id).includes(questionId)) {
            throw new Error('Cannot submit more than one lottery answer per user.');
        }

        const result = await lotteryService.saveLottery(questionId, answerId, user._id);

        res.status(201).json({
            id: result._id
        });
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const getQuestions = async (req, res) => {
    const questions = await lotteryService.listLotteriesForUser(req.user.id);
    res.status(200).json(questions);
};

exports.getQuestions = getQuestions;
exports.postRewardAnswer = postLotteryAnswer;
