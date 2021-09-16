const { CategoryBetTemplate } = require("@wallfair.io/wallfair-commons").models;

exports.listBetTemplates = async () => {
    return CategoryBetTemplate.find({ });
};
