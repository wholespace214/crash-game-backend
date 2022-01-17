const path = require("path");
const fs = require("fs");

let yml = fs.readFileSync(path.resolve(__dirname, `spec-${process.env.stage}.yml`)).toString();
console.log(
    yml
        .replace("$VERSION", process.env.version)
        .replace("$JWT", process.env.JWT_KEY)
        .replace("$TWILIO_ACC_SID", process.env.TWILIO_ACC_SID)
        .replace("$TWILIO_AUTH_TOKEN", process.env.TWILIO_AUTH_TOKEN)
        .replace("$TWILIO_SID", process.env.TWILIO_SID)
        .replace("$POSTGRES_PASSWORD", process.env.POSTGRES_PASSWORD)
        .replace("$GMAIL_PASSWORD", process.env.GMAIL_PASSWORD)
        .replace("$TWITCH_CLIENT_ID", process.env.TWITCH_CLIENT_ID)
        .replace("$TWITCH_CLIENT_SECRET", process.env.TWITCH_CLIENT_SECRET)
        .replace("$TWITCH_CALLBACK_SECRET", process.env.TWITCH_CALLBACK_SECRET)
        .replace("$ADMIN_USERNAME", process.env.ADMIN_USERNAME)
        .replace("$ADMIN_PASSWORD", process.env.ADMIN_PASSWORD)
        .replace("$GOOGLE_API_KEY", process.env.GOOGLE_API_KEY)
        .replace("$STAGING_MONGO_DB_URL", process.env.STAGING_MONGO_DB_URL)
        .replace("$PRODUCTION_MONGO_DB_URL", process.env.PRODUCTION_MONGO_DB_URL)
        .replace("$PRODUCTION_POSTGRES_DB", process.env.PRODUCTION_POSTGRES_DB)
        .replace("$STAGING_POSTGRES_DB", process.env.STAGING_POSTGRES_DB)
        .replace("$AWS_S3_CLIENT_ID", process.env.AWS_S3_CLIENT_ID)
        .replace("$AWS_S3_CLIENT_SECRET", process.env.AWS_S3_CLIENT_SECRET)
        .replace("$AWS_S3_CLIENT_BUCKET", process.env.AWS_S3_CLIENT_BUCKET)
        .replace("$AWS_S3_CLIENT_REGION", process.env.AWS_S3_CLIENT_REGION)
);