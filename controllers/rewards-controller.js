const twitchService = require('../services/twitch-service');
const { validationResult } = require('express-validator');

const userService = require("../services/user-service");

const questionsMock = [
    {
      id: 1,
      question: 'What Kind Of UI You Prefer?',
      answers: [
        { name: 'One', value: '1' },
        { name: 'Two', value: '2' },
        { name: 'Three', value: '3' },
      ],
    },
    {
      id: 2,
      question: 'What Kind Of UI You Prefer2?',
      answers: [
        { name: 'One2', value: '1' },
        { name: 'Two2', value: '2' },
        { name: 'Three2', value: '3' },
      ],
    },
    {
      id: 3,
      question: 'What Kind Of UI You Prefer3?',
      answers: [
        { name: 'One3', value: '1' },
        { name: 'Two3', value: '2' },
        { name: 'Three3', value: '3' },
      ],
    },
    {
      id: 4,
      question: 'What Kind Of UI You Prefer4?',
      answers: [
        { name: 'One4', value: '1' },
        { name: 'Two4', value: '2' },
        { name: 'Three4', value: '3' },
      ],
    },
    {
      id: 5,
      question: 'What Kind Of UI You Prefer5?',
      answers: [
        { name: 'One5', value: '1' },
        { name: 'Two5', value: '2' },
        { name: 'Three5', value: '3' },
      ],
    },
  ];

const postRewardAnswer = async (req, res, next) => {
    const errors  = validationResult(req);

    if (!errors.isEmpty()) {
        return next(res.status(422).send('Invalid input passed, please check it'));
    }

    try {
        const user = await userService.getUserById(req.user.id);
        // const { questionId, answerId } = req.body;

        // TODO submit to DB
        // const payloadToDb = { questionId, answerId, userId, createdAt };
        res.status(201).json({
            id: Math.round(Math.random() * 1000)
        });
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

const getQuestions = async (req, res, next) => {
    // TODO use DB
    res.status(200).json(questionsMock);
};

exports.getQuestions = getQuestions;
exports.postRewardAnswer = postRewardAnswer;
