const fs = require('fs');
const txt = fs.readFileSync('qqmusic_vendor.js', 'utf8');

// The line containing 'return u = ie(r.data)'
const index = txt.indexOf('return u = ie(r.data)');
if (index !== -1) {
    // Print the preceding 5000 characters to see variable scope
    console.log("Scope:\n", txt.substring(Math.max(0, index - 5000), index + 500));
}
