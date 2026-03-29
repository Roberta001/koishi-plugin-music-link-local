import * as crypto from 'crypto';

export function generateQQMusicSign(jsonPayload: string): string {
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

const NETEASE_PRESET_KEY = Buffer.from('0CoJUm6Qyw8W8jud');
const NETEASE_IV = Buffer.from('0102030405060708');
const NETEASE_PUB_KEY_MODULUS = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
const NETEASE_PUB_KEY_EXPONENT = '010001';

const createSecretKey = (size: number) => {
    const keys = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < size; i++) key += keys.charAt(Math.floor(Math.random() * keys.length));
    return key;
};

const aesEncrypt = (text: string, key: Buffer, iv: Buffer) => {
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
};

const rsaEncrypt = (text: string, pubKey: string, modulus: string) => {
    const reversedText = text.split('').reverse().join('');
    const hexText = Buffer.from(reversedText).toString('hex');
    const bigIntSrc = BigInt('0x' + hexText);
    const bigIntMod = BigInt('0x' + modulus);
    const bigIntExp = BigInt('0x' + pubKey);
    let result = 1n;
    let base = bigIntSrc % bigIntMod;
    let exponent = bigIntExp;
    while (exponent > 0n) {
        if (exponent % 2n === 1n) result = (result * base) % bigIntMod;
        exponent = exponent / 2n;
        base = (base * base) % bigIntMod;
    }
    return result.toString(16).padStart(256, '0');
};

export function weapi(object: any) {
    const text = JSON.stringify(object);
    const secretKey = createSecretKey(16);
    const params = aesEncrypt(text, NETEASE_PRESET_KEY, NETEASE_IV);
    const encText = aesEncrypt(params, Buffer.from(secretKey), NETEASE_IV);
    const encSecKey = rsaEncrypt(secretKey, NETEASE_PUB_KEY_EXPONENT, NETEASE_PUB_KEY_MODULUS);
    return { params: encText, encSecKey: encSecKey };
}
