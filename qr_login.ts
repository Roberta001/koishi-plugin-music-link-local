function qrsigToPtqrtoken(qrsig: string): number {
    let e = 0;
    for (let i = 0, n = qrsig.length; i < n; ++i) {
        e += (e << 5) + qrsig.charCodeAt(i);
    }
    return 2147483647 & e;
}

const appid = "716027609";
const daid = "383";

async function startQRLogin() {
    console.log('[*] 获取 QQ 音乐登录二维码...');
    const url = `https://ssl.ptlogin2.qq.com/ptqrshow?appid=${appid}&e=2&l=M&s=3&d=72&v=4&t=${Math.random()}&daid=${daid}&pt_3rd_aid=100497308`;
    const getRes = await fetch(url);
    const bodyBuffer = await getRes.arrayBuffer();
    
    // Extract qrsig
    const setCookie = getRes.headers.get('set-cookie');
    let qrsig = '';
    if (setCookie) {
        const parts = setCookie.split(',');
        for (const c of parts) {
            if (c.includes('qrsig=')) {
                qrsig = c.split('qrsig=')[1].split(';')[0];
            }
        }
    }
    if (!qrsig) {
        console.log('[-] 无法获取 qrsig');
        return;
    }

    const fs = require('fs');
    fs.writeFileSync('qrcode.png', Buffer.from(bodyBuffer));
    console.log(`[+] 二维码已保存到 qrcode.png，请扫描！(计算 ptqrtoken: ${qrsigToPtqrtoken(qrsig)})`);

    const ptqrtoken = qrsigToPtqrtoken(qrsig);
    let isWaiting = true;

    while (isWaiting) {
        await new Promise(r => setTimeout(r, 2000));
        const checkUrl = `https://ssl.ptlogin2.qq.com/ptqrlogin?u1=https%3A%2F%2Fy.qq.com%2Fm%2Fact%2Fxyjd%2Findex.html&ptqrtoken=${ptqrtoken}&ptredirect=1&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-${Date.now()}&js_ver=21020514&js_type=1&login_sig=&pt_uistyle=40&aid=${appid}&daid=${daid}&`;
        
        try {
            const checkRes = await fetch(checkUrl, {
                headers: { 
                    'Cookie': `qrsig=${qrsig}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://xui.ptlogin2.qq.com/'
                }
            });
            const resStr = await checkRes.text();
            if (checkRes.status !== 200) {
                 console.log(`[-] HTTP Error: ${checkRes.status} - ${resStr}`);
            }

            const match = resStr.match(/ptuiCB\('([^']+)','([^']*)','([^']*)','([^']*)','([^']*)'/);
            if (match) {
                const code = match[1];
                const msg = match[5];
                if (code === '66') {
                    // Not scanned
                } else if (code === '67') {
                    console.log('[-] 已扫码，请确认登录:', msg);
                } else if (code === '65') {
                    console.log('[-] 二维码已失效');
                    isWaiting = false;
                } else if (code === '0') {
                    console.log('\n[+] 扫码登录成功！', msg);
                    const redirectUrl = match[3];
                    console.log('[*] 获取最终 Cookies...');
                    
                    const finalRes = await fetch(redirectUrl, { redirect: 'manual' });
                    const finalCookies = finalRes.headers.get('set-cookie');
                    console.log('\n[*] 最终 QQ 通用 Cookies:');
                    console.log(finalCookies);
                    
                    console.log('\n[*] 提取敏感凭证:');
                    if (finalCookies) {
                        finalCookies.split(',').forEach(c => {
                            if (c.includes('p_skey=')) console.log(c.split(';')[0].trim());
                            if (c.includes('skey=')) console.log(c.split(';')[0].trim());
                            if (c.includes('qm_keyst=')) console.log(c.split(';')[0].trim());
                        });
                    }
                    isWaiting = false;
                } else {
                    console.log('[-] 未知状态:', code, msg);
                }
            } else {
                console.log('[-] 未解析响应:', resStr);
            }
        } catch (err) {
            console.log('[-] 请求出错:', err);
        }
    }
}

startQRLogin();
