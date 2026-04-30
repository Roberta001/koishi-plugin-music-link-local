const fs = require('fs');

async function download() {
    const url = "https://y.qq.com/ryqq/js/vendor.chunk.062f57657390b2408623.js?max_age=2592000";
    console.log("Fetching...");
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://y.qq.com/"
        }
    });
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    const text = await res.text();
    fs.writeFileSync('qqmusic_vendor.js', text);
    console.log("Saved.");
}

download().catch(console.error);
