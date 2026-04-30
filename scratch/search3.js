const fs = require('fs');
const txt = fs.readFileSync('qqmusic_vendor.js', 'utf8');

['ie\\(', 'ae\\(', 'se\\(', 'function ie', 'function ae', 'function se', 'ie=', 'ae=', 'se='].forEach(q => {
    let re = new RegExp(q.replace(/\(/g, '\\('), 'g');
    let m;
    while(m = re.exec(txt)){
        if (m.index > 50) {
            console.log(`Matched ${q} at ${m.index}:\n`, txt.substring(m.index - 50, m.index + 150));
        }
    }
});
