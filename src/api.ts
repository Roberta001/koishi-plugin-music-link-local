import { Context, Dict } from 'koishi';
import { generateQQMusicSign, weapi } from './crypto';

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class MusicApi {
    constructor(private ctx: Context) {}

    // ---- QQ Music API ----
    async qqSearch(keyword: string, limit: number = 5, debug: boolean = false) {
        const url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=${encodeURIComponent(keyword)}&p=1&n=${limit}&format=json&t=0&aggr=1&cr=1`;
        let data = await this.ctx.http.get(url, { 
            responseType: 'json',
            headers: { 'User-Agent': DEFAULT_UA, 'Referer': 'https://y.qq.com/' }
        });
        
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) {}
        }

        if (debug) {
            this.ctx.logger('music-link').info('QQ Search Response:', JSON.stringify(data, null, 2));
        }
        
        return data?.data?.song?.list || [];
    }

    async getQQMediaMid(songmid: string, debug: boolean = false) {
        const payload = JSON.stringify({
            comm: { ct: 24, cv: 0 },
            req: {
                module: "music.pf_song_detail_svr",
                method: "get_song_detail",
                param: { song_mid: songmid }
            }
        });
        const url = `https://u.y.qq.com/cgi-bin/musicu.fcg`;
        let resRaw = await fetch(url, {
            method: 'POST',
            body: payload,
            headers: {
                'Referer': 'https://y.qq.com/',
                'Origin': 'https://y.qq.com',
                'User-Agent': DEFAULT_UA,
                'Content-Type': 'application/json'
            }
        });
        
        let res: any = {};
        try { res = await resRaw.json(); } catch (e) {}

        if (debug) this.ctx.logger('music-link').info('QQ Media Mid Response:', JSON.stringify(res, null, 2));
        const media_mid = res?.req?.data?.track_info?.file?.media_mid;
        return media_mid || songmid;
    }

    async getQQPlayUrl(songmid: string, media_mid: string, uin: string = '0', pgv_pvid: string = '9201161220', cookie: string = '', debug: boolean = false) {
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
                    filename: [`F000${media_mid}.flac`]
                }
            }
        });
        
        const sign = generateQQMusicSign(payload);
        const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?sign=${sign}`;
        
        const headers: Dict = {
            'Referer': 'https://y.qq.com/',
            'Origin': 'https://y.qq.com',
            'User-Agent': DEFAULT_UA,
            'Content-Type': 'application/json'
        };
        if (cookie) headers['Cookie'] = cookie;

        let res = await this.ctx.http.post(url, payload, { headers });
        if (typeof res === 'string') {
            try { res = JSON.parse(res); } catch (e) {}
        }
        if (debug) this.ctx.logger('music-link').info('QQ Play URL Response F000:', JSON.stringify(res, null, 2));
        let midurlinfo = res?.req?.data?.midurlinfo?.[0];
        
        if (!midurlinfo?.purl) {
            const payloadMp3 = JSON.stringify({
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
                        filename: [`M800${media_mid}.mp3`]
                    }
                }
            });
            const signMp3 = generateQQMusicSign(payloadMp3);
            res = await this.ctx.http.post(`https://u.y.qq.com/cgi-bin/musicu.fcg?sign=${signMp3}`, payloadMp3, { headers });
            if (typeof res === 'string') {
                try { res = JSON.parse(res); } catch (e) {}
            }
            if (debug) this.ctx.logger('music-link').info('QQ Play URL Response M800:', JSON.stringify(res, null, 2));
            midurlinfo = res?.req?.data?.midurlinfo?.[0];
        }

        if (!midurlinfo?.purl) {
            const payloadM4a = JSON.stringify({
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
            const signM4a = generateQQMusicSign(payloadM4a);
            res = await this.ctx.http.post(`https://u.y.qq.com/cgi-bin/musicu.fcg?sign=${signM4a}`, payloadM4a, { headers });
            if (typeof res === 'string') {
                try { res = JSON.parse(res); } catch (e) {}
            }
            if (debug) this.ctx.logger('music-link').info('QQ Play URL Response C400:', JSON.stringify(res, null, 2));
            midurlinfo = res?.req?.data?.midurlinfo?.[0];
        }

        if (midurlinfo && midurlinfo.purl) {
            const sip = res?.req?.data?.sip?.[0] || 'http://ws.stream.qqmusic.qq.com/';
            return sip + midurlinfo.purl;
        }
        return null;
    }

    async refreshQQToken(qqAccount: any) {
        if (!qqAccount.psrf_qqopenid || !qqAccount.qqmusic_key || !qqAccount.psrf_qqrefresh_token) {
            throw new Error("Missing required QQ tokens for refresh.");
        }
        const payload = JSON.stringify({
            comm: { ct: 24, cv: 0, uin: qqAccount.uin },
            req: {
                module: "music.login.LoginServer",
                method: "Login",
                param: {
                    openid: qqAccount.psrf_qqopenid,
                    musickey: qqAccount.qqmusic_key,
                    musicid: parseInt(qqAccount.uin) || 0,
                    expired_in: 0,
                    onlyNeedAccessToken: 0,
                    forceRefreshToken: 0,
                    appid: 100497308,
                    deviceName: "PC",
                    deviceType: "Widnows",
                    refresh_key: qqAccount.psrf_qqrefresh_token,
                    access_token: qqAccount.psrf_qqaccess_token || '',
                    refresh_token: qqAccount.psrf_qqrefresh_token
                }
            }
        });
        const sign = generateQQMusicSign(payload);
        const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?sign=${sign}`;
        
        // Use global fetch to safely get headers without Koishi API differences
        const res = await fetch(url, {
            method: 'POST',
            body: payload,
            headers: {
                'Referer': 'https://y.qq.com/',
                'Origin': 'https://y.qq.com',
                'User-Agent': DEFAULT_UA,
                'Content-Type': 'application/json',
                'Cookie': qqAccount.cookie
            }
        });
        
        const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
        const rawCookieHeader = res.headers.get('set-cookie');
        
        let cookiesArray: string[] = [];
        if (setCookies.length > 0) {
            cookiesArray = setCookies;
        } else if (rawCookieHeader) {
            // Very naive split, usually separated by comma.
            cookiesArray = rawCookieHeader.split(/,(?=\s*[^;]+=[^;]+)/);
        }
        
        return cookiesArray;
    }

    // ---- Netease Music API ----
    async neteaseSearch(keyword: string, limit: number = 5, debug: boolean = false, cookie: string = '') {
        const url = `https://music.163.com/weapi/search/get`;
        const data = {
            s: keyword,
            type: 1,
            offset: 0,
            limit,
            total: true
        };
        const form = weapi(data);
        const postData = `params=${encodeURIComponent(form.params)}&encSecKey=${encodeURIComponent(form.encSecKey)}`;
        
        const headers: Dict = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://music.163.com/',
            'User-Agent': DEFAULT_UA
        };
        if (cookie) headers['Cookie'] = cookie;

        let resRaw = await fetch(url, {
            method: 'POST',
            body: postData,
            headers
        });
        
        let res: any = {};
        try {
            res = await resRaw.json();
        } catch (e) {}

        if (debug) {
            this.ctx.logger('music-link').info('Netease Search Response:', JSON.stringify(res, null, 2));
        }

        return res?.result?.songs || [];
    }

    async getNeteasePlayUrl(id: string | number, cookie: string = '', debug: boolean = false) {
        const url = `https://music.163.com/api/song/enhance/player/url/v1?id=${id}&ids=[${id}]&level=lossless&encodeType=flac`;
        const headers: Dict = {
            'Referer': 'https://music.163.com/',
            'User-Agent': DEFAULT_UA
        };
        if (cookie) headers['Cookie'] = cookie;
        let res = await this.ctx.http.get(url, { headers });
        if (typeof res === 'string') {
            try { res = JSON.parse(res); } catch (e) {}
        }
        if (debug) this.ctx.logger('music-link').info('Netease Play URL Lossless Response:', JSON.stringify(res, null, 2));
        let purl = res?.data?.[0]?.url;
        if (!purl) {
            const fallbackUrl = `https://music.163.com/api/song/enhance/player/url/v1?id=${id}&ids=[${id}]&level=standard&encodeType=mp3`;
            let fallbackRes = await this.ctx.http.get(fallbackUrl, { headers });
            if (typeof fallbackRes === 'string') {
                try { fallbackRes = JSON.parse(fallbackRes); } catch (e) {}
            }
            if (debug) this.ctx.logger('music-link').info('Netease Play URL Standard Response:', JSON.stringify(fallbackRes, null, 2));
            purl = fallbackRes?.data?.[0]?.url;
        }
        return purl;
    }

    async refreshNeteaseToken(cookie: string, csrf: string) {
        const url = `https://music.163.com/weapi/login/token/refresh?csrf_token=${csrf}`;
        const form = weapi({});
        const postData = `params=${encodeURIComponent(form.params)}&encSecKey=${encodeURIComponent(form.encSecKey)}`;
        const res = await fetch(url, {
            method: 'POST',
            body: postData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://music.163.com/',
                'User-Agent': DEFAULT_UA,
                'Cookie': `${cookie}; os=pc; appver=2.9.7;`
            }
        });
        
        const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
        const rawCookieHeader = res.headers.get('set-cookie');
        
        let cookiesArray: string[] = [];
        if (setCookies.length > 0) {
            cookiesArray = setCookies;
        } else if (rawCookieHeader) {
            cookiesArray = rawCookieHeader.split(/,(?=\s*[^;]+=[^;]+)/);
        }
        
        return cookiesArray;
    }
}