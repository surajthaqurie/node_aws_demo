const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

const {
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");

const s3 = require("./aws.config");
const upload = require("./multer");

app.get("/", (req, res, next) => {
  return res.send("API working !!");
});

app.post("/upload", upload.single("file"), function (req, res, next) {
  return res.json({
    message: "Successfully uploaded file!",
    file: req.file,
  });
});

app.get("/bucket/files", async (req, res, next) => {
  const command = new ListObjectsV2Command({
    Bucket: process.env.AWS_S3_BUCKET,
    MaxKeys: 1,
  });

  try {
    let isTruncated = true;
    let arr = [];

    while (isTruncated) {
      let { Contents, IsTruncated, NextContinuationToken } = await s3.send(
        command
      );

      if (Contents !== undefined) {
        const contentsList = Contents.map((c) => `${c.Key}`).join("\n");
        arr.push(contentsList);
        isTruncated = IsTruncated;
        command.input.ContinuationToken = NextContinuationToken;
      } else {
        break;
      }
    }
    return res.json(arr);
  } catch (err) {
    console.error(err);
  }
});

app.get("/bucket/files/:key", async (req, res, next) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: req.params.key,
  });
  try {
    const response = await s3.send(command);
    const str = await response.Body.transformToString();
    return res.send(str);
  } catch (err) {
    console.error(err);
  }
});

app.delete("/bucket/files", async (req, res, next) => {
  const key = req.query.filename;
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  try {
    const response = await s3.send(command);
    return res.send(response);
  } catch (err) {
    console.error(err);
  }
});

app.get("/download/file", async (req, res, next) => {
  const filename = req.query.filename;
  let response = await getFileLink(filename);
  return res.send(response);
});

function getFileLink(filename) {
  return new Promise(function (resolve, reject) {
    const options = {
      url: process.env.CLOUDFRONT_URL + filename,
      keyPairId: process.env.CLOUDFRONT_ACCESS_KEY_ID,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
      dateLessThan: new Date(Date.now() + 1000 * 60 * 1), // Expires in 5 Mins
    };

    const signedUrl = getSignedUrl(options);
    resolve(signedUrl);
  });
}

app.listen(8080, () => {
  console.log("App is running at port 8080");
});
