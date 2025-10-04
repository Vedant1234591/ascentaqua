const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const products = [
    {
        name: "AscentAqua Premium 750ml",
        description: "Experience pure hydration with our premium 750ml water bottle. Advanced filtration ensures mineral-rich, refreshing water.",
        price: 5.00,
        capacity: "750ml",
        material: "Premium PVC",
        weight: "126g",
        dimensions: "242mm × 55mm",
        color: "Black passage plastic white",
        features: ["BPA Free", "Recyclable", "Eco-Friendly", "Crush After Use", "Mineral Rich"],
        inStock: true,
        image: "/images/bottle.png"
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ascentaqua');
        console.log('Connected to MongoDB');
        
        // Clear existing data
        await Product.deleteMany({});
        await User.deleteMany({});
        console.log('Cleared existing data');
        
        // Create admin user with manual password hashing to ensure it works
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash('admin123', saltRounds);
        
        console.log('Creating admin user...');
        console.log('Email: admin@ascentaqua.com');
        console.log('Password: admin123');
        console.log('Hashed password:', hashedPassword);
        
        const adminUser = new User({
            name: 'Administrator',
            email: 'admin@ascentaqua.com',
            password: hashedPassword, // Set the already hashed password
            phone: '0000000000',
            role: 'admin'
        });
        
        await adminUser.save();
        console.log('Admin user created successfully');
        
        // Test the password
        const testMatch = await bcrypt.compare('admin123', hashedPassword);
        console.log('Password test result:', testMatch);
        
        // Create products
        await Product.insertMany(products);
        console.log('Products created');
        
        console.log('\n=== SEEDING COMPLETE ===');
        console.log('Admin credentials:');
        console.log('Email: admin@ascentaqua.com');
        console.log('Password: admin123');
        console.log('=========================\n');
        
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seedDatabase();