const { isAdmin } = require("../helper");
const betTemplateService = require("../services/bet-template-service");
const { ErrorHandler } = require("../util/error-handler");

const getBetTemplates = async (req, res, next) => {
    try {
        if (!isAdmin(req)) return next(new ErrorHandler(403, 'Action not allowed'));

        const betTemplates = await betTemplateService.listBetTemplates();

        res.status(200).json(betTemplates);
    } catch (err) {
        console.error(err.message);
        let error = res.status(422).send(err.message);
        next(error);
    }
};

exports.getBetTemplates = getBetTemplates;
