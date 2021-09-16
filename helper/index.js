exports.isAdmin = (req) => !(req.user.admin === false && req.params.userId !== req.user.id);
exports.createYouTubeVideoUrlFromId = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;
