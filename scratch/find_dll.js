const fs = require('fs');
const path = require('path');

const dir = 'D:\\Program Files (x86)\\Tencent\\QQMusic';
const searchStrings = ['vkey.GetVkeyServer', 'CgiGetVkey', 'musics.fcg', 'musicu.fcg', 'qm_keyst', 'ag-1'];
const files = fs.readdirSync(dir).filter(f => f.endsWith('.dll') || f.endsWith('.exe'));

console.log("Searching in", files.length, "files...");

for (const f of files) {
    const p = path.join(dir, f);
    try {
        const buf = fs.readFileSync(p);
        const textAscii = buf.toString('ascii');
        const textUtf16 = buf.toString('utf16le');
        
        let found = [];
        for (const s of searchStrings) {
            if (textAscii.includes(s) || textUtf16.includes(s)) {
                found.push(s);
            }
        }
        if (found.length > 0) {
            console.log(`Found in ${f}:`, found.join(', '));
        }
    } catch (e) {
        // Ignore read errors
    }
}
