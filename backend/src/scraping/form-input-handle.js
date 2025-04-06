import { ELEMENT_TIMEOUT } from "../utils/constants.js";

// Fill Recorrido, Precio and Teléfono celular using label
export const fillInputByLabel = async (page, labelText, inputValue) => {
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
export const clickRadioByLabel = async (page, labelText) => {
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

export const selectMantineDropdownOption = async (page, labelText, optionText, isSearchable = false) => {
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

export const clickButtonWithText = async (page, text) => {
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

export async function waitForElement(page, selector, timeout = ELEMENT_TIMEOUT) {
    try {
        await page.waitForSelector(selector, { timeout });
    } catch (error) {
        throw new Error(`Element ${selector} not found after ${timeout}ms: ${error.message}`);
    }
}