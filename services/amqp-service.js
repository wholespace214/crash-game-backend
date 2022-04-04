const amqplib = require("amqplib");

const retry = require('../util/retryHandler');
const { PROCESSORS } = require("../services/subscribers-service");

const rabbitUrl = process.env.RABBITMQ_CONNECTION;

let connection, channel;

const SUBSCRIBERS = [
  {
    exchange: 'universal_events',
    exchangeType: 'topic',
    queue: 'universal_events.backend',
    routingKeys: ['event.deposit_created', 'event.webhook_triggered', 'event.withdraw_requested'],
    durable: true,
    autoDelete: false,
    prefetch: 50
  },
  {
    exchange: 'cron_jobs',
    exchangeType: 'topic',
    queue: 'cron_jobs.backend',
    routingKeys: ['backend.promo_code_expiration'],
    durable: true,
    autoDelete: false,
    prefetch: 50
  },
];

const ROUTING_MAPPING = {
  ['event.deposit_created']: PROCESSORS.deposit,
  ['event.webhook_triggered']: PROCESSORS.deposit,
  ['event.withdraw_requested']: PROCESSORS.withdraw,
  ['backend.promo_code_expiration']: PROCESSORS.promoCodesExpiration,
};

const init = async () => {
  connection = await amqplib.connect(rabbitUrl, {
    heartbeat: 60,
    noDelay: true,
  });
  channel = await connection.createChannel();
};

const send = async (exchange, routingKey, data, options) => {
  try {
    await channel.assertExchange(exchange, "topic", { durable: true });
    channel.publish(exchange, routingKey, Buffer.from(data), options);
    console.log("PUBLISH %s - %s", exchange, routingKey);
  } catch (e) {
    console.error("Error in publishing message", e);
  }
};

const subscribe = async () => {
  try {
    SUBSCRIBERS.forEach(async (cfg) => {
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
      });

      channel.consume(
        q.queue,
        async (msg) => {
          const routingKey = msg.fields.routingKey;
          const content = JSON.parse(msg.content.toString());
          const processor = ROUTING_MAPPING[routingKey];

          try {
            if (processor && !processor.running) {
              await processor.call(routingKey, content);
            }
          } catch (e) {
            console.error(`${routingKey} failed`, e.message);
            retry(processor.call, [routingKey, content]);
          }
        },
        {
          noAck: true
        }
      );

      console.info(new Date(), `[*] rabbitMQ: "${cfg.exchange}" exchange on [${cfg.routingKeys.join(', ')}] routing keys subscribed. Waiting for messages...`);
    });
  } catch (e) {
    console.error("subscribe error", e);
  }
};

module.exports = { init, send, subscribe };
