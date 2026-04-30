const fs = require('fs');
const txt = fs.readFileSync('qqmusic_vendor.js', 'utf8');

let idx = 0;
while ((idx = txt.indexOf('abrupt("return", new Promise', idx)) !== -1) {
    console.log("==================\n", txt.substring(Math.max(0, idx - 100), Math.min(txt.length, idx + 400)));
    idx += 10;
}
