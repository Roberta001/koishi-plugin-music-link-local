export function parseMusicCard(dataStr: string) {
    try {
        let str = typeof dataStr === 'string' ? dataStr.replace(/&amp;/g, '&').replace(/&quot;/g, '"') : '';
        const data = typeof dataStr === 'string' ? JSON.parse(str) : dataStr;
        if (data.meta && data.meta.music) {
            const music = data.meta.music;
            const url = music.jumpUrl || music.musicUrl || '';
            const songInfo = {
                name: music.title || '',
                artist: music.desc || '',
                coverUrl: music.preview || ''
            };
            
            if (music.tag === 'QQ音乐' || music.appid === 100497308 || url.includes('y.qq.com')) {
                const match = url.match(/songmid=([^&]+)/) || url.match(/songid=([^&]+)/);
                if (match) return { platform: 'qq', id: match[1], ...songInfo };
            }
            if (music.tag === '网易云音乐' || music.appid === 100495085 || url.includes('music.163.com')) {
                const match = url.match(/id=(\d+)/);
                if (match) return { platform: 'netease', id: match[1], ...songInfo };
            }
        }
    } catch(e) {}
    return null;
}
