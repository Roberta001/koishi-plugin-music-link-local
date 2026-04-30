import { generateQQMusicSign } from './src/crypto';

// Notice I removed qm_keyst entirely
const cookie = "pgv_pvid=7353465273; fqm_pvqid=b3e93437-5375-4f28-928c-4aa00d88edbc; fqm_sessionid=0d88df7e-32f5-4d35-9429-f7735e61eb7e; pgv_info=ssid=s2296620632; ts_last=y.qq.com/; ts_uid=4489984316; _qpsvr_localtk=0.6965747752831838; ptui_loginuin=2596628651; RK=SczeTZhk9m; ptcz=e718ed5826d5c483e0d0632b47c4cbba27e0665f3e211d624c6473947bc40b14; login_type=1; psrf_musickey_createtime=1776479046; psrf_qqopenid=4C78EDB2EAC89DD6AE1BEDAB09F88F39; euin=ow4q7wCANeCkov**; psrf_qqaccess_token=82B39B2E9417AFB1D53280CDAFB6A172; uin=2596628651; psrf_access_token_expiresAt=1781663046; wxunionid=; qqmusic_key=Q_H_L_63k3NNFsjnnKdbkhWE4sPe0lVrC1slbzqHlHHG7jqrgEC_r0XE31NSg1ijFnUFzcCRHTOnZVEXxG39tynUPxygU1fC3mJnQ; wxopenid=; wxrefresh_token=; tmeLoginType=2; psrf_qqunionid=10BFAE5A435E20BFEB53EF17878E21CD; psrf_qqrefresh_token=A21EC32EB60134C8E7DCE4539B9CED78; music_ignore_pskey=202306271436Hn@vBj";

async function test() {
    const uin = "2596628651";
    const songmid = "003aAYrm3GE0Ac";
    const media_mid = "0020wJDo3cx0j3";
    const req_types = [
        { name: "F000", filename: `F000${media_mid}.flac` }
    ];

    for (const type of req_types) {
        // Try with req
        const payload = JSON.stringify({
            comm: { ct: 24, cv: 0, uin },
            req: {
                module: "vkey.GetVkeyServer",
                method: "CgiGetVkey",
                param: {
                    guid: "7353465273",
                    songmid: [songmid],
                    songtype: [0],
                    uin,
                    loginflag: 1,
                    platform: "20",
                    filename: [type.filename]
                }
            }
        });

        const sign = generateQQMusicSign(payload);
        let url = `https://u.y.qq.com/cgi-bin/musicu.fcg?sign=${sign}`;

        const headers = {
            'Referer': 'https://y.qq.com/',
            'Origin': 'https://y.qq.com',
            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
            'Content-Type': 'application/json',
            'Cookie': cookie
        };

        const res = await fetch(url, { method: 'POST', body: payload, headers });
        const json = await res.json();
        console.log(`NO qm_keyst + req + ${type.name}:`, JSON.stringify(json, null, 2));
    }
}

test();
