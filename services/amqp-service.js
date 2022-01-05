const amqplib = require("amqplib");

const retry = require('../util/retryHandler');

const rabbitUrl = process.env.RABBITMQ_CONNECTION;

let connection, channel;

const DEPOSIT_CREATED_SUBSCRIBER = {
  exchange: 'universal_events',
  exchangeType: 'topic',
  queue: 'universal_events.backend',
  routingKeys: ['event.deposit_created', 'event.withdraw_requested'],
  durable: true,
  autoDelete: false,
  prefetch: 50
};

const init = async () => {
  connection = await amqplib.connect(rabbitUrl, {
    heartbeat: 60,
    noDelay: true,
  });
  channel = await connection.createChannel();
};

const send = async (exchange, routingKey, data) => {
  try {
    await channel.assertExchange(exchange, "topic", { durable: true });
    channel.publish(exchange, routingKey, Buffer.from(data));
    console.log("PUBLISH %s - %s", exchange, routingKey);
  } catch (e) {
    console.error("Error in publishing message", e);
  }
};

const subscribeDepositsChannel = async () => {
  try {
    const {processDepositEvent, processWithdrawEvent} = require("../services/subscribers-service");

    const cfg = DEPOSIT_CREATED_SUBSCRIBER;
    channel.prefetch(cfg.prefetch);

    await channel.assertExchange(cfg.exchange, cfg.exchangeType, {
      durable: cfg.durable,
    });
    const q = await channel.assertQueue(cfg.queue, {
      durable: cfg.durable,
      autoDelete: cfg.autoDelete
    });

    cfg.routingKeys.forEach(async (routingKey) => {
      await channel.bindQueue(q.queue, cfg.exchange, routingKey);
    })

    channel.consume(
      q.queue,
      async (msg) => {
        if (msg.fields.routingKey === 'event.withdraw_requested') {
          await processWithdrawEvent(
            msg.fields.routingKey, JSON.parse(msg.content.toString())
          ).catch((consumeErr) => {
            console.error('processDepositEvent failed with error:', consumeErr);
            retry(processDepositEvent, [msg.fields.routingKey, JSON.parse(msg.content.toString())]);
          })
        } else {
          await processDepositEvent(
            msg.fields.routingKey, JSON.parse(msg.content.toString())
          ).catch((consumeErr) => {
            console.error('processDepositEvent failed with error:', consumeErr);
            retry(processDepositEvent, [msg.fields.routingKey, JSON.parse(msg.content.toString())]);
          })
        }
      },
      {
        noAck: true
      }
    );

    console.info(new Date(), `[*] rabbitMQ: "${cfg.exchange}" exchange on [${cfg.routingKeys.join(', ')}] routing keys subscribed. Waiting for messages...`);
  } catch (e) {
    console.error("subscribeDepositsChannel error", e);
  }
};

module.exports = { init, send, subscribeDepositsChannel };
