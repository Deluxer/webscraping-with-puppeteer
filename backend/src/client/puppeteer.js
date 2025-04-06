import puppeteer from 'puppeteer';
import { NAVIGATION_TIMEOUT } from "../utils/constants.js";

const puppeteerClient = async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1366, height: 768 }
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

    console.log('Browser launched');
    return page;
}

export default puppeteerClient;