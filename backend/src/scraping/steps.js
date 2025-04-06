import { CREDENTIALS, FORM_FIELDS, NAVIGATION_TIMEOUT } from "../utils/constants.js";
import { takeScreenshot } from "../utils/helpers.js";
import { clickButtonWithText, clickRadioByLabel, fillInputByLabel, selectMantineDropdownOption, waitForElement } from "./form-input-handle.js";
import path from 'path';

export const login = async (page) => {
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
}

export const sellVehicle = async (page) => {
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
}
    
export const selectPlan = async (page) => {
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
}

export const fillVehicleInfo = async (page, price) => {
    console.log('Looking for "informacion-y-precio"');

    // Define dropdowns by labels and desired values
    const dropdownFields = FORM_FIELDS.dropdown;

    // Wait for the container of the step to appear
    await waitForElement(page, '.mantine-Paper-root');

    // Optional: ensure at least one input has rendered
    await waitForElement(page, 'input[id*="mantine"]');

    // Select each dropdown field
    for (const field of dropdownFields) {
        await selectMantineDropdownOption(page, field.label, field.value);
    }

    const inputFields = FORM_FIELDS.inputs;

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
}

export const fillDescriptionAndImages = async (page, description) => {
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
}

export const fillContactInfo = async (page) => {
    // Step 5: Contact information
    console.log('📱 Filling Teléfono celular...');
    await fillInputByLabel(page, 'Teléfono celular', '1234567890');

    console.log('✅ Teléfono celular filled');

    // Try to go to the next step
    await clickButtonWithText(page, 'Siguiente');
}

export const publishAd = async (page) => {
    // Wait for 1 second to let components fully load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 6: Final step - Take screenshot and publish
    console.log('Taking final screenshot before publishing');
    const screenshotPath = await takeScreenshot(page, 'final_step_payment');
    
    console.log('FINISHED successfully');
    return screenshotPath;
}
