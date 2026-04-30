async function testWechatRefresh() {
    const wxopenid = "dummy_wxopenid_for_testing";
    const wxrefresh_token = "dummy_wxrefresh_token_for_testing";
    const musickey = "";
    const musicuin = "0";

    const url = new URL('https://c.y.qq.com/base/fcgi-bin/login_get_musickey.fcg');
    url.searchParams.append('from', '1');
    url.searchParams.append('force_access', '1');
    url.searchParams.append('wxopenid', wxopenid);
    url.searchParams.append('wxrefresh_token', wxrefresh_token);
    url.searchParams.append('musickey', musickey);
    url.searchParams.append('musicuin', musicuin);
    url.searchParams.append('get_access_token', '1');
    url.searchParams.append('ct', '1001');
    url.searchParams.append('format', 'json');
    url.searchParams.append('inCharset', 'utf-8');
    url.searchParams.append('outCharset', 'utf-8');

    console.log('[*] 正在尝试调用微信系独立换签接口...');
    console.log('[*] URL: ' + url.toString());

    try {
        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Referer': 'https://y.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // Mimicking typical Web cookies structure
                'Cookie': `wxopenid=${wxopenid}; wxrefresh_token=${wxrefresh_token}`
            }
        });

        console.log(`\n[*] 状态码 HTTP ${res.status}`);
        
        const rawArray = await res.text();
        console.log('\n[*] 响应体内容:');
        console.log(rawArray);

        console.log('\n[*] 提取的 Set-Cookie (寻找新的 qm_keyst 和 wxrefresh_token):');
        const setCookieList = res.headers.get('set-cookie');
        if (setCookieList) {
            console.log(setCookieList);
        } else {
            console.log('[-] 未下发 Set-Cookie');
        }

    } catch (e) {
        console.error('[-] 访问出错:', e);
    }
}

testWechatRefresh();
