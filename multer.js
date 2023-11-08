const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidv4 } = require("uuid");

const s3 = require("./aws.config");

const folder = process.env.AWS_S3_FOLDER_NAME;
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      cb(null, `${folder}/${uuidv4()}_${file.originalname.trim()}`);
    },
  }),
});

module.exports = upload;
