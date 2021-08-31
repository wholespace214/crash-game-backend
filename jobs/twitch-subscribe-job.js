const Event = require("../models/Event");
const twitchService = require("../services/twitch-service");

const findAndSubscribe = async () => {
    const session = await Event.startSession();
    try {
        await session.withTransaction(async () => {
            let unsubscribedEvents = await Event.find(
                // check which query performs better under heavy load
                //{type: "streamed", $or: [{"metadata": {$exists: false}}, {"metadata.twitch_subscribed": {$exists: false}}]}
                {
                    type: "streamed", 
                    "$or": [
                        {"metadata.twitch_subscribed_online": "false"},
                        {"metadata.twitch_subscribed_offline": "false"}
                    ]
                }
            ).limit(5).exec();

            for (let unsubscribedEvent of unsubscribedEvents) {
                console.log(new Date(), "Subscribe on twitch for event", unsubscribedEvent.name);

                // subscribe for online events
                let onlineSubscriptionStatus = await twitchService.subscribeForOnlineNotifications(unsubscribedEvent.metadata.twitch_id);
                unsubscribedEvent.metadata.twitch_subscribed_online = onlineSubscriptionStatus;

                //subscribe for offline events
                offlineSubscriptionStatus = await twitchService.subscribeForOfflineNotifications(unsubscribedEvent.metadata.twitch_id);
                unsubscribedEvent.metadata.twitch_subscribed_offline = offlineSubscriptionStatus;

                await unsubscribedEvent.save();
            }
        });
    } catch (err) {
        console.log(err);
    } finally {
        await session.endSession();
    }
};

const initTwitchSubscribeJob = () => {
    setInterval(findAndSubscribe, 5_000);
};

exports.initTwitchSubscribeJob = initTwitchSubscribeJob;