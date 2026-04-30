import { generateQQMusicSign } from './src/crypto.ts';

async function testBootstrapLogin() {
    const uin = '2596628651';
    const psrf_qqopenid = '4C78EDB2EAC89DD6AE1BEDAB09F88F39';
    const psrf_qqrefresh_token = 'A21EC32EB60134C8E7DCE4539B9CED78';
    
    // Convert UIN to musicid (remove any letters at start, parse as int)
    const musicid = parseInt(uin.replace(/^[a-zA-Z0]+/, '')) || 0;

    // Exact payload derived from sub_100B2990
    const payload = JSON.stringify({
        comm: { ct: 24, cv: 0, uin },
        req: {
            module: "music.login.LoginServer",
            method: "Login",
            param: {
                openid: psrf_qqopenid,
                musickey: "W_X.01n2vD_XmF.dummy", // Pass dummy to simulate old key
                expired_in: 0,
                musicid: musicid,
                onlyNeedAccessToken: 0,
                forceRefreshToken: 0,
                appid: 716027609, // Changed to Web AppID
                deviceName: "Web", // Changed
                deviceType: "Web", // Changed
                refresh_key: psrf_qqrefresh_token,
                access_token: "", // Emulate old logic
                refresh_token: psrf_qqrefresh_token
            }
        }
    });

    const sign = generateQQMusicSign(payload);
    const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?sign=${sign}`;

    console.log('[*] 正在向 Tencent LoginServer 发起 Bootstrap Login 请求...');
    console.log('[*] Payload: ', JSON.stringify(JSON.parse(payload), null, 2));
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            body: payload,
            headers: {
                'Referer': 'https://y.qq.com/',
                'Origin': 'https://y.qq.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/json'
            }
        });

        const data = await res.json();
        console.log('\n[*] 响应内容 (Body):');
        console.log(JSON.stringify(data, null, 2));

        console.log('\n[*] 提取的 Set-Cookie 列表:');
        let rawSetCookie = res.headers.get('set-cookie');
        if (!rawSetCookie) {
            console.log("[-] 未在响应头中找到 set-cookie。");
        } else {
            // Split cookies logically (commas break dates, so we parse properly)
            const parts = rawSetCookie.split(',');
            const cookiesArray: string[] = [];
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].match(/expires=[A-Za-z]{3}$/i) && i + 1 < parts.length) {
                    cookiesArray.push(parts[i] + ',' + parts[i + 1]);
                    i++;
                } else {
                    cookiesArray.push(parts[i]);
                }
            }
            cookiesArray.forEach(c => console.log('  -> ' + c));
            
            // Check specifically for qm_keyst
            const qm_keyst = cookiesArray.find(c => c.startsWith('qm_keyst='));
            if (qm_keyst) {
                console.log('\n[+] 成功捕获 qm_keyst! 授权链路已打通!!!');
                console.log('    ' + qm_keyst.split(';')[0]);
            } else {
                console.log('\n[-] 响应头中未发现 qm_keyst');
            }
        }
    } catch (e) {
        console.error('[-] 请求出错:', e);
    }
}

testBootstrapLogin();
