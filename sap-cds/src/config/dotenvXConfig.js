// src/config/dotenvXConfig.js
const dotEnvX = require('@dotenvx/dotenvx');
dotEnvX.config()
module.exports = {
    HOST: process.env.HOST || 'NO ENCONTRE VARIABLE DE ENTORNO',
    PORT: process.env.PORT || 'NO ENCONTRE PORT',
    API_URL: process.env.API_URL || 'NO SE ENCONTRO VARIABLE DE ENTORNO',
    CONNECTION_STRING: process.env.CONNECTION_STRING || 'NO SE ENCONTRO VARIABLE DE ENTORNO', 
    DATABASE: process.env.DATABASE || 'NO SE ENCONTRO VARIABLE DE ENTORNO',  
    DB_USER: process.env.DB_USER || 'NO SE ENCONTRO VARIABLE DE ENTORNO',  
    DB_PASSWORD: process.env.DB_PASSWORD || 'NO SE ENCONTRO VARIABLE DE ENTORNO'
};