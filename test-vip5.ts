import { generateQQMusicSign } from './src/crypto';

const cookie = "pgv_pvid=7353465273; ptui_loginuin=2596628651; RK=SczeTZhk9m; ptcz=e718ed5826d5c483e0d0632b47c4cbba27e0665f3e211d624c6473947bc40b14; login_type=1; psrf_musickey_createtime=1776479046; psrf_qqopenid=4C78EDB2EAC89DD6AE1BEDAB09F88F39; euin=ow4q7wCANeCkov**; psrf_qqaccess_token=82B39B2E9417AFB1D53280CDAFB6A172; uin=o2596628651; psrf_access_token_expiresAt=1781663046; qqmusic_key=Q_H_L_63k3NNFsjnnKdbkhWE4sPe0lVrC1slbzqHlHHG7jqrgEC_r0XE31NSg1ijFnUFzcCRHTOnZVEXxG39tynUPxygU1fC3mJnQ; psrf_qqunionid=10BFAE5A435E20BFEB53EF17878E21CD; psrf_qqrefresh_token=A21EC32EB60134C8E7DCE4539B9CED78; music_ignore_pskey=202306271436Hn@vBj";

async function test() {
    const uin = "o2596628651";
    const songmid = "003aAYrm3GE0Ac";
    const media_mid = "0020wJDo3cx0j3";
    const req_types = [
        { name: "F000", filename: `F000${media_mid}.flac` }
    ];

    for (const type of req_types) {
        // App typically uses ct=11
        const payload = JSON.stringify({
            comm: { ct: 11, cv: 12080008, uin },
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
        // Using musics.fcg!
        let url = `https://u6.y.qq.com/cgi-bin/musics.fcg?sign=${sign}`;

        const headers = {
            'Referer': 'https://y.qq.com/',
            'Origin': 'https://y.qq.com',
            'User-Agent': "QQMusic/1280008 (Windows; Windows 10.0)",
            'Content-Type': 'application/json',
            'Cookie': cookie
        };

        const res = await fetch(url, { method: 'POST', body: payload, headers });
        let responseText = await res.text();
        try {
             let json = JSON.parse(responseText);
             console.log(`musics.fcg NO qm_keyst + ct=11 + req + ${type.name}:`, JSON.stringify(json, null, 2));
        } catch (e) {
             console.log(`Failed to parse JSON, raw text top 100:`, responseText.substring(0, 100));
        }
    }
}

test();
