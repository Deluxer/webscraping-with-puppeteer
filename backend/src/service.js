import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

const CREDENTIALS = {
    email: process.env.SEMINUEVOS_EMAIL,
    password: process.env.SEMINUEVOS_PASSWORD
};

const NAVIGATION_TIMEOUT = 60000;
const ELEMENT_TIMEOUT = 10000;

const PUPPETEER_CONFIG = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1366, height: 768 }
};

const formFields = {
    dropdown: [
        {label: 'Marca', value: 'Acura'},
        {label: 'Modelo', value: 'ILX'},
        {label: 'Año', value: '2018'},
        {label: 'Versión', value: '2.4 Tech At'},
        {label: 'Subtipo', value: 'Sedán'},
        {label: 'Color', value: 'Negro'}
    ],
    inputs: {    
        postal_code: {label: 'Código Postal', value: '64420'},
        city: {label: 'Ciudad del vehículo', value: 'San Nicolás de los Garza'},
        mileage: {label: 'Recorrido', value: '50000'},
        phone: {label: 'Teléfono celular', value: '1234567890'}
    }
};

// TODO: Add validation for price recommendation
async function postAdToSeminuevos({ price, description, formFields }) {
    const browser = await puppeteer.launch(PUPPETEER_CONFIG);
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(NAVIGATION_TIMEOUT);
        page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

        console.log('Browser launched');

        // Navigate to login page
        console.log('Navigating to login page...');
        await page.goto('https://admin.seminuevos.com/login', {
            waitUntil: 'networkidle0',
            timeout: NAVIGATION_TIMEOUT
        });
        console.log('On login page');

        // Fill and submit login form
        await waitForElement(page, '#email');
        await waitForElement(page, '#password');

        await page.type('#email', CREDENTIALS.email);
        await page.type('#password', CREDENTIALS.password);

        console.log('Submitting login...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle0' })
        ]);

        // Validate login
        const errorSelector = '.alert-error, .error-message, .text-error, .text-red-500';
        const errorElement = await page.$(errorSelector);
        if (errorElement) {
            const errorText = await page.evaluate(el => el.textContent, errorElement);
            throw new Error(`Login failed: ${errorText.trim()}`);
        }

        const currentUrl = page.url();
        if (currentUrl.includes('/login') || currentUrl.includes('iniciar-sesion')) {
            throw new Error('Login failed: Still on login page');
        }

        console.log('Login successful');

        // Look for "Vende tu vehículo" button by href or text
        console.log('Looking for "vende tu vehículo" button by href or text...');
        await waitForElement(page, 'a.btn-primary');

        const links = await page.$$('a.btn-primary');
        let found = false;

        for (const link of links) {
            const text = await page.evaluate(el => el.innerText.trim().toLowerCase(), link);
            const href = await page.evaluate(el => el.getAttribute('href'), link);

            if (
                text.includes('vende tu vehículo') ||
                href?.includes('/particulares/vehiculos/publicar')
            ) {
                await Promise.all([
                    link.click(),
                    page.waitForNavigation({ waitUntil: 'networkidle0' })
                ]);
                found = true;
                break;
            }
        }

        if (!found) {
            throw new Error('Could not find the "vende tu vehículo" button.');
        }

        console.log('Navigated to vehicle publishing flow');

        // Select plan (button "Elegir plan")
        console.log('Looking for "Elegir plan" button...');
        await waitForElement(page, 'button');

        const planButtons = await page.$$('button');
        let planSelected = false;

        for (const button of planButtons) {
            const text = await page.evaluate(el => el.innerText.trim().toLowerCase(), button);
            if (text.includes('elegir plan')) {
                await Promise.all([
                    button.click(),
                    page.waitForNavigation({ waitUntil: 'networkidle0' })
                ]);
                planSelected = true;
                console.log('Plan seleccionado');
                break;
            }
        }

        if (!planSelected) {
            throw new Error('No plan selection buttons found');
        }

        console.log('Looking for "informacion-y-precio"');

        // Define dropdowns by labels and desired values
        const dropdownFields = formFields.dropdown;

        // Wait for the container of the step to appear
        await waitForElement(page, '.mantine-Paper-root');

        // Optional: ensure at least one input has rendered
        await waitForElement(page, 'input[id*="mantine"]');

        // Select each dropdown field
        for (const field of dropdownFields) {
            await selectMantineDropdownOption(page, field.label, field.value);
        }

        const inputFields = formFields.inputs;

        // Código Postal (searchable)
        let foundPostalCode = await selectMantineDropdownOption(page, inputFields.postal_code.label, inputFields.postal_code.value, true);

        // Ciudad del vehículo
        let foundCity = await selectMantineDropdownOption(page, inputFields.city.label, inputFields.city.value);

        // If we get here and these values weren't found, throw specific error
        if (!foundPostalCode || !foundCity) {
            throw new Error('Location not available. Please verify the postal code and city are valid for Seminuevos.');
        }
        
        // Fill Recorrido using label
        await fillInputByLabel(page, inputFields.mileage.label, inputFields.mileage.value);

        // Fill Precio using label
        await fillInputByLabel(page, 'Precio', price);        

        await clickRadioByLabel(page, 'Negociable');

        console.log('✅ Vehicle form filled');

        // Go to next step
        const nextClicked = await clickButtonWithText(page, 'Siguiente');
        if (!nextClicked) {
            throw new Error('Could not find or click the next button after vehicle form');
        }

        // Step 4: Description and images
        console.log('Adding description and images');
        // Type into the rich text editor (ProseMirror)
        await page.waitForSelector('div[contenteditable="true"].ProseMirror');
        await page.type('div[contenteditable="true"].ProseMirror', description);
        console.log('✅ Description added');
        
        const imageInput = await page.$('input[type="file"]');
        if (!imageInput) {
            throw new Error('Image upload input not found');
        }

        // Upload images with absolute paths
        // TODO: Replace with actual image paths from the request
        const imagePaths = [
            path.resolve(process.cwd(), 'images/car1.jpg'),
            path.resolve(process.cwd(), 'images/car2.jpg'),
            path.resolve(process.cwd(), 'images/car3.jpg')
        ];

        try {
            await imageInput.uploadFile(...imagePaths);
            console.log('Images uploaded');
        } catch (error) {
            throw new Error(`Failed to upload images: ${error.message}`);
        }

        await clickButtonWithText(page, 'Siguiente');

        // Step 5: Contact information
        console.log('📱 Filling Teléfono celular...');
        await fillInputByLabel(page, 'Teléfono celular', '1234567890');

        console.log('✅ Teléfono celular filled');

        // Try to go to the next step
        await clickButtonWithText(page, 'Siguiente');

        // Wait for 1 second to let components fully load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 6: Final step - Take screenshot and publish
        console.log('Taking final screenshot before publishing');
        const screenshotPath = await takeScreenshot(page, 'final_step_payment');
        
        console.log('FINISHED successfully');
        return screenshotPath;

    } catch (error) {
        console.error('Error in postAdToSeminuevos:', error);
        throw error; // Preserve the specific error message
    } finally {
        await browser.close();
    }
}

const selectMantineDropdownOption = async (page, labelText, optionText, isSearchable = false) => {
    const xpathExpression = `//label[contains(text(), "${labelText}")]`;
    await page.waitForSelector(`xpath/${xpathExpression}`);
    const cityName = optionText.toLowerCase().replace(/\s+/g, '');
    
    const labelHandle = await page.$(`xpath/${xpathExpression}`);
    if (!labelHandle) {
        console.warn(`⚠️ Label "${labelText}" not found`);
        return;
    }
    console.log(`✅ Label "${labelText}" found`);

    const labelId = await page.evaluate(el => el.getAttribute("id"), labelHandle);
    if (!labelId) {
        console.warn(`⚠️ Label "${labelText}" has no ID`);
        return;
    }
    console.log(`✅ Label ID: ${labelId}`);

    const inputId = await page.evaluate(el => el.getAttribute("for"), labelHandle);
    if (!inputId) {
        console.warn(`⚠️ Label "${labelText}" has no linked input`);
        return;
    }
    const inputSelector = `#${inputId}`;
    await page.waitForSelector(inputSelector);

    // If it's a searchable dropdown, simulate user typing
    if (isSearchable) {
        await page.click(inputSelector);
        await page.type(inputSelector, cityName);
        console.log(`⌨️ Typed "${cityName}" into "${labelText}" input`);
    } else {
        await page.click(inputSelector);
        console.log(`🖱️ Clicked input "${inputId}" to open dropdown`);
    }

    await page.waitForSelector(`div[role="listbox"][aria-labelledby="${labelId}"]`, { visible: true });

    const optionSelector = `div[role="listbox"][aria-labelledby="${labelId}"] div[role="option"]`;
    const options = await page.$$(optionSelector);

    for (const option of options) {
        const text = await page.evaluate(el => el.textContent?.trim(), option);
        const optionCity = text.toLowerCase().replace(/\s+/g, '');
        
        // Special handling for postal code and city
        const isMatch = 
            labelText === "Código Postal" ? optionCity.includes(cityName) :
            labelText === "Ciudad del vehículo" ? optionCity === cityName :
            optionCity === cityName;

        if (isMatch) {
            await page.evaluate(el => el.click(), option);
            console.log(`✅ Selected "${optionCity}" for "${labelText}"`);
            return true;
        }
    }

    console.warn(`❌ Could not find option "${cityName}" for "${labelText}"`);
    return false;
};

// Fill Recorrido, Precio and Teléfono celular using label
const fillInputByLabel = async (page, labelText, inputValue) => {
    const label = await page.evaluateHandle((text) => {
        const labels = Array.from(document.querySelectorAll('label'));
        return labels.find(l => l.textContent?.includes(text));
    }, labelText);

    if (!label) {
        console.warn(`⚠️ Label "${labelText}" not found`);
        return;
    }

    const inputId = await page.evaluate(el => el.getAttribute("for"), label);
    if (!inputId) {
        console.warn(`⚠️ No input associated with label "${labelText}"`);
        return;
    }

    const inputSelector = `#${inputId}`;
    // Clean the input field before typing
    await page.focus(inputSelector);
    await page.evaluate(selector => {
        const el = document.querySelector(selector);
        if (el) el.value = '';
    }, inputSelector);

    await page.type(inputSelector, inputValue.toString());

    console.log(`✅ Filled "${labelText}" with value "${inputValue}"`);
};

// Select Transacción radio by label
const clickRadioByLabel = async (page, labelText) => {
    const label = await page.evaluateHandle((text) => {
        const labels = Array.from(document.querySelectorAll('label'));
        return labels.find(l => l.textContent?.includes(text));
    }, labelText);

    if (!label) {
        console.warn(`⚠️ Radio label "${labelText}" not found`);
        return;
    }

    const radioId = await page.evaluate(el => el.getAttribute('for'), label);
    if (!radioId) {
        console.warn(`⚠️ Radio input not found for "${labelText}"`);
        return;
    }

    const radioSelector = `#${radioId}`;
    await page.click(radioSelector);
    console.log(`🎯 Transacción set to "${labelText}"`);
};

async function waitForElement(page, selector, timeout = ELEMENT_TIMEOUT) {
    try {
        await page.waitForSelector(selector, { timeout });
    } catch (error) {
        throw new Error(`Element ${selector} not found after ${timeout}ms: ${error.message}`);
    }
}

async function clickButtonWithText(page, text) {
    const buttons = await page.$$('button');
    for (const button of buttons) {
        const buttonText = await page.evaluate(el => el.innerText, button);
        if (buttonText.includes(text)) {
            await Promise.all([
                button.click(),
                page.waitForNavigation({ waitUntil: 'networkidle0' })
            ]);
            return true;
        }
    }
    return false;
}

async function ensureScreenshotsDir() {
    const dir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

async function takeScreenshot(page, name) {
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

// Serve screenshots directory statically
app.use('/screenshots', express.static(path.join(process.cwd(), 'screenshots')));

app.post('/api/post-ad', async (req, res) => {
    try {
        const { price, description } = req.body;
        
        if (!price || !description) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                message: 'Price and description are required',
                screenshot: false
            });
        }

        const screenshotPath = await postAdToSeminuevos({ price, description, formFields });
        
        // Convert local path to URL
        const screenshotUrl = `http://localhost:${PORT}/screenshots/${path.basename(screenshotPath)}`;
        
        res.json({
            success: true,
            message: 'Ad posted successfully',
            screenshot: screenshotUrl
        });

    } catch (error) {
        console.error('Error in /api/post-ad:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to post ad',
            screenshot: false
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
