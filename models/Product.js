const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    capacity: { type: String, required: true },
    material: { type: String, required: true },
    weight: { type: String, required: true },
    dimensions: { type: String, required: true },
    color: { type: String, required: true },
    features: [String],
    inStock: { type: Boolean, default: true },
    image: String
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);