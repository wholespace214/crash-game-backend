const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const wallfair = require('@wallfair.io/wallfair-commons');
const { Query, initDb, toWei } = require('@wallfair.io/trading-engine');
const { PROMO_CODE_DEFAULT_REF } = require('./constants');

async function connectMongoDB() {
  const connection = await mongoose.connect(process.env.DB_CONNECTION, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    readPreference: 'primary',
    retryWrites: true,
  });
  console.log('Connection to Mongo-DB successful');

  wallfair.initModels(connection);
  console.log('Mongoose models initialized');

  return connection;
}

const BONUSES = [
  {
    name: 'FIRST_DEPOSIT_DOUBLE_DEC21',
    value: 100_000,
    expires_at: new Date(2023, 1, 1).toISOString(),
  },
  {
    name: 'LAUNCH_1k_500',
    value: 500,
    expires_at: new Date().toISOString(),
  },
  {
    name: 'SURVEY_20220112',
    value: 450,
    expires_at: new Date().toISOString(),
  },
  {
    name: 'FIRST_DEPOSIT_450',
    value: 450,
    expires_at: new Date().toISOString(),
  },
  {
    name: 'EMAIL_CONFIRM_50',
    value: 50,
    expires_at: new Date().toISOString(),
  }
];

const doMigration = async () => {
  await connectMongoDB();
  await initDb();

  const queryRunner = new Query();

  console.log('Inserting promo codes...');

  for (const bonus of BONUSES) {
    await queryRunner.query(`
      INSERT INTO promo_code(name, type, value, count, expires_at)
      VALUES ($1, 'BONUS', $2, 1, $3)
      ON CONFLICT(name) DO NOTHING;
    `, [bonus.name, toWei(bonus.value).toString(), bonus.expires_at]);
  }

  const users = await wallfair.models.User.find(
    { bonus: { $exists: true } }
  ).select({ bonus: 1 });

  if (!users?.length) throw new Error('No users found!');

  console.log(`Inserting promo codes for ${users.length} users...`);

  for (const user of users) {
    for (const b of user.bonus) {
      await queryRunner.query(`
        INSERT INTO promo_code_user(user_id, promo_code_id, ref_id, status, count, usage)
        SELECT $1, pc.id, $2, 'FINALIZED', 1, 1 
        FROM promo_code pc
        WHERE name = $3 
        ON CONFLICT(user_id, promo_code_id, ref_id) DO NOTHING;
      `, [user._id.toString(), PROMO_CODE_DEFAULT_REF, b.name]);
    }
  }

  console.log('Migration done!');
}

(async () => {
  try {
    await doMigration();
  } catch (e) {
    console.error('Migration script failed: ', e.message);
  } finally {
    process.exit();
  }
})();
