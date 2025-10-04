const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: Number
    }],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
        name: String,
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        phone: String
    },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'shipped', 'delivered'], 
        default: 'pending' 
    },
    paymentStatus: { 
        type: String, 
        enum: ['pending', 'paid', 'failed'], 
        default: 'pending' 
    }
}, { timestamps: true });

// Virtual for checking if user exists
orderSchema.virtual('hasUser').get(function() {
    return this.user && this.user._id;
});

// Better population handling
orderSchema.methods.getSafeUser = function() {
    return this.user || { name: '[User Deleted]', email: 'N/A' };
};

module.exports = mongoose.model('Order', orderSchema);