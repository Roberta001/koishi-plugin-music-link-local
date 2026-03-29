import { Context, Schema, h, Session, Dict } from 'koishi';
import { MusicApi } from './api';
import * as fs from 'fs';
import * as path from 'path';
import { parseMusicCard } from './middleware';

export const name = 'music-link-local';

export interface ReturnField {
    data: string;
    describe: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'file';
    enable: boolean;
}

export interface Config {
    searchLimit: number;
    waitTimeout: number;
    exitCommand: string;
    autoRefreshTimer: number;
    debug: boolean;
    qqReturnDataField: ReturnField[];
    neteaseReturnDataField: ReturnField[];
    enableMiddleware: boolean;
    isFigure: boolean;
}

const returnFieldSchema = Schema.array(Schema.object({
    data: Schema.string().required().description('返回的字段名 (如 name, artist, album, coverUrl, musicUrl)'),
    describe: Schema.string().required().description('该字段的中文描述'),
    type: Schema.union(['text', 'image', 'audio', 'video', 'file']).default('text').description('字段发送类型'),
    enable: Schema.boolean().default(true).description('是否启用该字段')
})).role('table');

export const Config: Schema<Config> = Schema.object({
    searchLimit: Schema.number().default(10).description('单次搜索返回的歌曲列表长度。'),
    waitTimeout: Schema.number().default(60000).description('等待用户选择歌曲序号的超时时间（毫秒）。'),
    exitCommand: Schema.string().default('算了,不听了,退出').description('退出选择的指令，多个关键词用英文逗号隔开。'),
    autoRefreshTimer: Schema.number().default(86400000).description('自动刷新Token的时间间隔(毫秒，默认1天)'),
    debug: Schema.boolean().default(false).description('开启调试模式，在控制台输出详细的 API 响应日志'),
    qqReturnDataField: returnFieldSchema.default([
        { data: 'name', describe: '歌曲名称', type: 'text', enable: true },
        { data: 'artist', describe: '歌手', type: 'text', enable: true },
        { data: 'album', describe: '专辑', type: 'text', enable: true },
        { data: 'coverUrl', describe: '封面', type: 'image', enable: true },
        { data: 'musicUrl', describe: '下载链接', type: 'audio', enable: true }
    ]).description('QQ音乐歌曲信息的返回格式和内容。'),
    neteaseReturnDataField: returnFieldSchema.default([
        { data: 'name', describe: '歌曲名称', type: 'text', enable: true },
        { data: 'artist', describe: '歌手', type: 'text', enable: true },
        { data: 'album', describe: '专辑', type: 'text', enable: true },
        { data: 'coverUrl', describe: '封面', type: 'image', enable: true },
        { data: 'musicUrl', describe: '下载链接', type: 'audio', enable: true }
    ]).description('网易云音乐歌曲信息的返回格式和内容。'),
    enableMiddleware: Schema.boolean().default(false).description('是否启用中间件，自动解析聊天中的QQ音乐/网易云音乐卡片。'),
    isFigure: Schema.boolean().default(false).description('将歌曲信息以合并转发的形式发送（仅支持 OneBot v11 等协议）。')
});

interface AccountData {
    qq?: {
        cookie: string;
        uin: string;
        pgv_pvid: string;
        qqmusic_key: string;
        psrf_qqopenid: string;
        psrf_qqrefresh_token: string;
        psrf_qqaccess_token: string;
        lastRefresh: number;
    };
    netease?: {
        cookie: string;
        csrf: string;
        lastRefresh: number;
    };
}

export function apply(ctx: Context, config: Config) {
    const api = new MusicApi(ctx);
    const dataPath = path.join(ctx.baseDir, 'data', 'music-link-account.json');

    // Ensure data dir exists
    if (!fs.existsSync(path.dirname(dataPath))) {
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    }

    const readAccountData = (): AccountData => {
        if (!fs.existsSync(dataPath)) return {};
        try {
            return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        } catch {
            return {};
        }
    };

    const writeAccountData = (data: AccountData) => {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    };

    // Auto-refresh tokens periodically
    ctx.setInterval(async () => {
        const data = readAccountData();
        const now = Date.now();
        let updated = false;

        if (data.netease && (now - data.netease.lastRefresh > 7 * 24 * 3600 * 1000)) {
            try {
                const setCookies = await api.refreshNeteaseToken(data.netease.cookie, data.netease.csrf);
                if (setCookies && setCookies.length > 0) {
                    let newCookieStr = data.netease.cookie;
                    setCookies.forEach((c: string) => {
                        const match = c.match(/^([^=]+)=([^;]+)/);
                        if (match) {
                            const [full, key, val] = match;
                            const regex = new RegExp(`${key}=[^;]+`);
                            if (newCookieStr.match(regex)) {
                                newCookieStr = newCookieStr.replace(regex, `${key}=${val}`);
                            } else {
                                newCookieStr += `; ${key}=${val}`;
                            }
                            if (key === '__csrf') data.netease.csrf = val;
                        }
                    });
                    data.netease.cookie = newCookieStr;
                    data.netease.lastRefresh = now;
                    updated = true;
                    ctx.logger('music-link').info('成功刷新网易云音乐Token');
                }
            } catch (e) {
                ctx.logger('music-link').error('刷新网易云Token失败:', e);
            }
        }

        if (data.qq && (now - data.qq.lastRefresh > 7 * 24 * 3600 * 1000)) {
            try {
                const setCookies = await api.refreshQQToken(data.qq);
                if (setCookies && setCookies.length > 0) {
                    let newCookieStr = data.qq.cookie;
                    setCookies.forEach((c: string) => {
                        const match = c.match(/^([^=]+)=([^;]+)/);
                        if (match) {
                            const [full, key, val] = match;
                            const regex = new RegExp(`${key}=[^;]+`);
                            if (newCookieStr.match(regex)) {
                                newCookieStr = newCookieStr.replace(regex, `${key}=${val}`);
                            } else {
                                newCookieStr += `; ${key}=${val}`;
                            }
                            if (key === 'qqmusic_key') data.qq.qqmusic_key = val;
                            if (key === 'psrf_qqrefresh_token') data.qq.psrf_qqrefresh_token = val;
                            if (key === 'psrf_qqaccess_token') data.qq.psrf_qqaccess_token = val;
                        }
                    });
                    data.qq.cookie = newCookieStr;
                    data.qq.lastRefresh = now;
                    updated = true;
                    ctx.logger('music-link').info('成功刷新QQ音乐Token');
                }
            } catch (e) {
                ctx.logger('music-link').error('刷新QQ音乐Token失败:', e);
            }
        }

        if (updated) {
            writeAccountData(data);
        }
    }, config.autoRefreshTimer);

    // Middleware to parse QQ / 163 music cards
    if (config.enableMiddleware) {
        ctx.middleware(async (session, next) => {
            for (const el of session.elements) {
                let parsed: any = null;
                
                if (el.type === 'json' && el.attrs.data) {
                    parsed = parseMusicCard(el.attrs.data);
                } else if (el.type === 'onebot:music' || el.type === 'music') {
                    const type = el.attrs.type;
                    const id = el.attrs.id;
                    if ((type === 'qq' || type === '163') && id) {
                        parsed = { platform: type === 'qq' ? 'qq' : 'netease', id, name: '音乐分享', artist: '未知', coverUrl: '' };
                    }
                }
                
                if (parsed) {
                    const accountData = readAccountData();
                    let song: any = { platform: parsed.platform, id: parsed.id };
                    
                    // Use parsed info directly without searching
                    song.name = parsed.name || '音乐分享';
                    song.artist = parsed.artist || '未知';
                    song.album = '';
                    song.coverUrl = parsed.coverUrl || '';
                    
                    const msg = await renderSongMessage(song, config, api, accountData, session);
                    await session.send(msg);
                    return; // intercept
                }
            }
            return next();
        });
    }

    ctx.command('qqmusic [keyword:text]', '搜索QQ音乐')
        .alias('QQ音乐点歌')
        .option('login', '-l <cookie:string>', { authority: 4, fallback: '' })
        .action(async ({ session, options }, keyword) => {
            if (options.login) {
                const cookie = options.login;
                const extract = (key: string) => cookie.match(new RegExp(`${key}=([^;]+)`))?.[1] || '';
                const data = readAccountData();
                data.qq = {
                    cookie,
                    uin: extract('uin'),
                    pgv_pvid: extract('pgv_pvid'),
                    qqmusic_key: extract('qqmusic_key'),
                    psrf_qqopenid: extract('psrf_qqopenid'),
                    psrf_qqrefresh_token: extract('psrf_qqrefresh_token'),
                    psrf_qqaccess_token: extract('psrf_qqaccess_token'),
                    lastRefresh: Date.now()
                };
                writeAccountData(data);
                return '全局QQ音乐账号配置成功！并已自动保存。';
            }
            if (!keyword) return '请输入搜索关键词';
            return handleSearch(session, api, config, keyword, 'qq', readAccountData(), ctx);
        });

    ctx.command('163music [keyword:text]', '搜索网易云音乐')
        .alias('网易云点歌')
        .option('login', '-l <cookie:string>', { authority: 4, fallback: '' })
        .action(async ({ session, options }, keyword) => {
            if (options.login) {
                const cookie = options.login;
                const extract = (key: string) => cookie.match(new RegExp(`${key}=([^;]+)`))?.[1] || '';
                const data = readAccountData();
                data.netease = {
                    cookie,
                    csrf: extract('__csrf'),
                    lastRefresh: Date.now()
                };
                writeAccountData(data);
                return '全局网易云音乐账号配置成功！并已自动保存。';
            }
            if (!keyword) return '请输入搜索关键词';
            return handleSearch(session, api, config, keyword, 'netease', readAccountData(), ctx);
        });

    ctx.command('music [keyword:text]', '聚合搜索音乐')
        .alias('点歌')
        .action(async ({ session }, keyword) => {
            if (!keyword) return '请输入搜索关键词';
            return handleSearch(session, api, config, keyword, 'all', readAccountData(), ctx);
        });
}

async function renderSongMessage(song: any, config: Config, api: MusicApi, accountData: AccountData, session: Session) {
    const fields = song.platform === 'qq' ? config.qqReturnDataField : config.neteaseReturnDataField;
    let elements: any[] = [];
    
    let url = '';
    try {
        if (song.platform === 'qq') {
            const mediaMid = song.media_mid || await api.getQQMediaMid(song.id, config.debug);
            url = await api.getQQPlayUrl(
                song.id, 
                mediaMid, 
                accountData.qq?.uin || '0', 
                accountData.qq?.pgv_pvid || '9201161220',
                accountData.qq?.cookie || '',
                config.debug
            ) || '';
        } else {
            url = await api.getNeteasePlayUrl(song.id, accountData.netease?.cookie || '', config.debug) || '';
        }
    } catch(e) {
        if(config.debug) session.app.logger('music-link').error('renderSongMessage url fetch error', e);
    }
    
    for (const field of fields) {
        if (!field.enable) continue;
        
        let value = '';
        if (field.data === 'name') value = song.name;
        if (field.data === 'artist') value = song.artist;
        if (field.data === 'album') value = song.album;
        if (field.data === 'coverUrl') value = song.coverUrl;
        if (field.data === 'musicUrl') value = url;
        
        if (!value) continue;
        
        if (field.type === 'text') {
            elements.push(h.text(`${field.describe}: ${value}\n`));
        } else if (field.type === 'image') {
            elements.push(h.image(value));
        } else if (field.type === 'audio') {
            elements.push(h.audio(value));
        } else if (field.type === 'video') {
            elements.push(h.video(value));
        } else if (field.type === 'file') {
            elements.push(h.file(value));
        }
    }
    
    if (config.isFigure) {
        const nickname = session.author?.nickname || session.author?.name || session.bot.user?.name || 'Music Link';
        const userId = session.author?.userId || session.bot.userId || session.bot.selfId || '10000';
        
        const figureMessages = elements.map(el => h('message', { userId, nickname }, el));
        return h('figure', {}, figureMessages);
    }
    
    return elements;
}

async function handleSearch(session: Session, api: MusicApi, config: Config, keyword: string, platform: 'qq' | 'netease' | 'all', accountData: AccountData, ctx: Context) {
    let results: any[] = [];
    
    try {
        if (platform === 'qq' || platform === 'all') {
            const qqRes = await api.qqSearch(keyword, platform === 'all' ? Math.floor(config.searchLimit / 2) : config.searchLimit, config.debug);
            qqRes.forEach(song => {
                results.push({
                    platform: 'qq',
                    id: song.songmid,
                    name: song.songname,
                    artist: song.singer ? song.singer.map((s: any) => s.name).join('/') : '未知',
                    album: song.albumname || '',
                    coverUrl: song.albummid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albummid}.jpg` : '',
                    media_mid: song.media_mid
                });
            });
        }
        
        if (platform === 'netease' || platform === 'all') {
            const netRes = await api.neteaseSearch(keyword, platform === 'all' ? Math.ceil(config.searchLimit / 2) : config.searchLimit, config.debug, accountData.netease?.cookie || '');
            if (Array.isArray(netRes)) {
                netRes.forEach(song => {
                    results.push({
                        platform: 'netease',
                        id: song.id,
                        name: song.name,
                        artist: song.ar ? song.ar.map((s: any) => s.name).join('/') : (song.artists ? song.artists.map((s: any) => s.name).join('/') : '未知'),
                        album: song.al ? song.al.name : (song.album ? song.album.name : ''),
                        coverUrl: song.al ? song.al.picUrl : (song.album && song.album.artist ? song.album.artist.img1v1Url : ''),
                    });
                });
            }
        }
    } catch (e) {
        if (config.debug) {
            ctx.logger('music-link').error('Search error:', e);
        }
        return `搜索失败: ${e.message}`;
    }

    if (results.length === 0) {
        return '未找到相关歌曲。';
    }

    let msg = `🔎 找到以下音乐：\n`;
    results.forEach((song, i) => {
        msg += `${i + 1}. [${song.platform === 'qq' ? 'QQ' : '网易'}] ${song.name} - ${song.artist}\n`;
    });
    msg += `\n请在 ${config.waitTimeout / 1000} 秒内输入序号选择：`;

    await session.send(msg);

    const input = await session.prompt(config.waitTimeout);
    if (!input) return '已超时，取消点歌。';
    
    const exitCommands = config.exitCommand.split(',').map(s => s.trim());
    if (exitCommands.includes(input)) {
        return '已退出选择。';
    }

    const index = parseInt(input) - 1;
    if (isNaN(index) || index < 0 || index >= results.length) {
        return '序号无效，已取消。';
    }

    const selected = results[index];
    const finalMsg = await renderSongMessage(selected, config, api, accountData, session);
    return finalMsg;
}