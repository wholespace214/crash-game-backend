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
    );