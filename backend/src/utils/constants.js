import dotenv from 'dotenv';

dotenv.config();

export const CREDENTIALS = {
    email: process.env.SEMINUEVOS_EMAIL,
    password: process.env.SEMINUEVOS_PASSWORD
};

export const NAVIGATION_TIMEOUT = 60000;
export const ELEMENT_TIMEOUT = 10000;

export const FORM_FIELDS = {
    dropdown: [
        {label: 'Marca', value: 'Acura'},
        {label: 'Modelo', value: 'ILX'},
        {label: 'Año', value: '2018'},
        {label: 'Versión', value: '2.4 Tech At'},
        {label: 'Subtipo', value: 'Sedán'},
        {label: 'Color', value: 'Negro'}
    ],
    inputs: {    
        postal_code: {label: 'Código Postal', value: '64000'},
        city: {label: 'Ciudad del vehículo', value: 'Monterrey'},
        mileage: {label: 'Recorrido', value: '50000'},
        phone: {label: 'Teléfono celular', value: '1234567890'}
    }
};