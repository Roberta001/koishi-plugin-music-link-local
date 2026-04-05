const crypto = require('crypto');

function generateQQMusicSign(jsonPayload) {
    const b64 = Buffer.from(jsonPayload).toString('base64');
    const reversedB64 = b64.split('').reverse().join('');
    const hmacKey = Buffer.from("9oA16aD646A3");
    const hmac = crypto.createHmac('sha1', hmacKey);
    hmac.update(reversedB64);
    const hash = hmac.digest(); 
    let randomChars = '';
    for (let i = 0; i < 12; i++) randomChars += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    let sign = Buffer.concat([Buffer.from(randomChars), hash]).toString('base64');
    return 'zzb' + sign.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); 
}

const uin = '0';
const pgv_pvid = '9201161220';
const songmid = '004SoxRg1QUDap';
const media_mid = '003mAan70zUy5O'; // the real media_mid from previous test

const payload = JSON.stringify({
    comm: { ct: 24, cv: 0, uin },
    req: {
        module: "vkey.GetVkeyServer",
        method: "CgiGetVkey",
        param: {
            guid: pgv_pvid,
            songmid: [songmid],
            songtype: [0],
            uin,
            loginflag: 1,
            platform: "20",
            filename: [`C400${media_mid}.m4a`]
        }
    }
});

const sign = generateQQMusicSign(payload);
const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?sign=${sign}`;

fetch(url, {
    method: 'POST',
    body: payload,
    headers: {
        'Referer': 'https://y.qq.com/',
        'Origin': 'https://y.qq.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json'
    }
}).then(async res => {
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
});
