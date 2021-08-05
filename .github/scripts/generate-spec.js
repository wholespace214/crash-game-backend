const path = require("path");
const fs = require("fs");

let yml = fs.readFileSync(path.resolve(__dirname, `spec-${process.env.stage}.yml`)).toString();
console.log(yml.replace("$VERSION", process.env.version));