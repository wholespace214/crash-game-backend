// Import the express Router to create routes
const router = require("express").Router();
const { check } = require("express-validator");

const Event = require('../../models/Event');

router.post("/", async (req, res, chain) => {
    console.log("TWITCH_INCOMING", JSON.stringify(req.body));

    // handle twitch challenges
    if (req.header("Twitch-Eventsub-Message-Type") === "webhook_callback_verification") {
        let type = req.header("Twitch-Eventsub-Subscription-Type");
        let broadcaster_user_id = req.body.subscription.condition.broadcaster_user_id;

        try {
            await session.withTransaction(async () => {
                let event = await Event.find({"metadata.twitch_id": broadcaster_user_id}).exec();

                if (type == "stream.online") {
                    event.metadata.twitch_subscribed_online = "true";
                    await event.save();
                } else if (type == "stream.offline") {
                    event.metadata.twitch_subscribed_offline = "true";
                    await event.save();
                }
            });
        } catch (err) {
            console.log("AQUI", err);
        } finally {
            await session.endSession();
        }

        res.send(req.body.challenge);
    }

    // handle twitch events
    if (req.header("Twitch-Eventsub-Message-Type") === "notification") {
        let type = req.header("Twitch-Eventsub-Subscription-Type");
        let broadcaster_user_id = req.body.subscription.condition.broadcaster_user_id;

        const session = await Event.startSession();
        try {
            await session.withTransaction(async () => {
                let event = await Event.find({"metadata.twitch_id": broadcaster_user_id}).exec();

                if (type == "stream.online") {
                    event.state = "online";
                    await event.save();
                } else if (type == "stream.offline") {
                    event.state = "offline";
                    await event.save();
                }
            });
        } catch (err) {
            console.log("AQUI", err);
        } finally {
            await session.endSession();
        }

        res.sendStatus(200);
    } 
});

module.exports = router;