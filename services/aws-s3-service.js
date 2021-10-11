const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const CLIENT_ID = process.env.AWS_S3_CLIENT_ID;
const CLIENT_SECRET = process.env.AWS_S3_CLIENT_SECRET;
const BUCKET = process.env.AWS_S3_CLIENT_BUCKET;
const REGION = process.env.AWS_S3_CLIENT_REGION;

let s3Client;

const init = () => {
  s3Client = new S3Client({
    credentials: {
      accessKeyId: CLIENT_ID,
      secretAccessKey: CLIENT_SECRET
    },
    region: REGION
  });
}

const upload = async (user, image) => {
  const params = {
    Key: `${user}/${image.filename}`,
    Body: Buffer.from(image.src.replace(/^data:image\/\w+;base64,/, ""), 'base64'),
    Bucket: BUCKET,
  }

  try {
    await s3Client.send(new PutObjectCommand(params));
    return await getSignedUrl(s3Client, new GetObjectCommand(params));
  } catch (err) {
    console.log("AWS-S3 upload error", err.message);
    throw new Error(err.message);
  }
}

module.exports = {
  init,
  upload
};