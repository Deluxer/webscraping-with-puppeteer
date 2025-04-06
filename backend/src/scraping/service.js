import { login, sellVehicle, selectPlan, fillVehicleInfo, fillDescriptionAndImages, fillContactInfo, publishAd } from './steps.js';
import puppeteerClient from '../client/puppeteer.js';

// TODO: Add validation for price recommendation (it stops the process)
async function postAdToSeminuevos({ price, description }) {
    const page = await puppeteerClient();
    try {
        await login(page);

        await sellVehicle(page);

        await selectPlan(page);

        await fillVehicleInfo(page, price);

        await fillDescriptionAndImages(page, description);

        await fillContactInfo(page);

        const screenshotPath = await publishAd(page);

        return screenshotPath;

    } catch (error) {
        console.error('Error in postAdToSeminuevos:', error);
        throw error;
    } finally {
        await page.browser().close();
    }
}

export default postAdToSeminuevos;
