// Este archivo manejará la lógica de subida a un servicio externo
// Ejemplo con Cloudinary (deberás instalar 'cloudinary' npm package)
// npm install cloudinary

const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFileToCloudinary = async (filePath, folderName) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `gestion-colegios/${folderName}`,
            resource_type: 'auto' // 'image', 'video', 'raw' (for documents)
        });
        return result.secure_url; // URL segura del archivo subido
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Failed to upload file.');
    }
};

module.exports = {
    uploadFileToCloudinary
};