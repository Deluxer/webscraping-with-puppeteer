import fs from 'fs';
import path from 'path';

async function ensureScreenshotsDir() {
    const dir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

export async function takeScreenshot(page, name) {
    await ensureScreenshotsDir();
    const timestamp = Date.now();
    const screenshotPath = path.join(process.cwd(), 'screenshots', `${name}_${timestamp}.png`);
    await page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
    });
    console.log(`Screenshot taken: ${screenshotPath}`);
    return screenshotPath;
}