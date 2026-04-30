const fs = require('fs');
const txt = fs.readFileSync('qqmusic_vendor.js', 'utf8');

const target = 'n.abrupt("return", new Promise((function(e, n) {';
const j = txt.indexOf(target);
if (j !== -1) {
    console.log(txt.substring(j - 2000, j + 2000));
}
