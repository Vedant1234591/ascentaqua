const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const path = require('path');const flash = require('express-flash');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ascentaqua', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'ascentaqua_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.email !== 'admin@ascentaqua.com') {
        return res.status(403).render('pages/error', { 
            message: 'Access denied. Admin privileges required.',
            cartCount: req.session.cart ? req.session.cart.length : 0
        });
    }
    next();
};
// Global middleware to make user and cart available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart || [];
    next();
});

// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ascentaqua-products',
    format: async (req, file) => 'png',
    public_id: (req, file) => {
      const timestamp = Date.now();
      return `product-${timestamp}`;
    },
  },
});

const upload = multer({ storage: storage });

// Add this main index route to fetch products
// Main index route - Fetch products for display
app.get('/', async (req, res) => {
    try {
        console.log('Fetching products for index page...');
        
        // Fetch all in-stock products, sorted by newest first
        const products = await Product.find({ inStock: true }).sort({ createdAt: -1 }).limit(3);
        
        console.log('Products found:', products.length);
        products.forEach(product => {
            console.log(`Product: ${product.name}, Image: ${product.image}`);
        });
        
        res.render('pages/index', {
            products: products, // Make sure this is passed correctly
            cartCount: req.session.cart ? req.session.cart.length : 0
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        // Render with empty products array if there's an error
        res.render('pages/index', {
            products: [],
            cartCount: req.session.cart ? req.session.cart.length : 0
        });
    }
});


// ========== ROUTES ========== //

// Home Page// ========== ADMIN ROUTES ========== //

// Admin Middleware
// Manual admin creation route (remove after testing)
app.get('/create-admin-now', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const User = require('./models/User');
        
        // Delete existing admin
        await User.deleteOne({ email: 'admin@ascentaqua.com' });
        
        // Create new admin
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const adminUser = new User({
            name: 'Administrator',
            email: 'admin@ascentaqua.com',
            password: hashedPassword,
            phone: '0000000000',
            role: 'admin'
        });
        
        await adminUser.save();
        
        res.json({
            success: true,
            message: 'Admin user created',
            email: 'admin@ascentaqua.com',
            password: 'admin123'
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});
// Admin Dashboard - Add message stats
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find().populate('user').sort({ createdAt: -1 }).limit(5);
        const products = await Product.find().sort({ createdAt: -1 });
        const messages = await Message.find().sort({ createdAt: -1 }).limit(5);
        
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalMessages = await Message.countDocuments();
        const unreadMessages = await Message.countDocuments({ status: 'unread' });
        
        const totalRevenueResult = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        const totalRevenue = totalRevenueResult[0]?.total || 0;

        res.render('pages/admin/dashboard', {
            user: req.session.user,
            orders,
            products,
            messages,
            stats: {
                totalOrders,
                totalProducts,
                totalMessages,
                unreadMessages,
                totalRevenue
            },
            cartCount: 0
        });
    } catch (error) {
        console.error(error);
        res.render('pages/error', { 
            message: 'Error loading admin dashboard',
            user: req.session.user,
            cartCount: 0
        });
    }
});
// Debug route to check admin user and password
app.get('/debug-admin-check', async (req, res) => {
    try {
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');
        
        const admin = await User.findOne({ email: 'admin@ascentaqua.com' });
        
        if (!admin) {
            return res.json({ error: 'Admin user not found' });
        }

        // Test password comparison
        const testPassword = 'admin123';
        const isPasswordValid = await bcrypt.compare(testPassword, admin.password);
        
        res.json({
            adminExists: true,
            adminEmail: admin.email,
            storedPassword: admin.password,
            testPassword: testPassword,
            passwordMatch: isPasswordValid,
            passwordLength: admin.password.length
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});
// Create test orders (for development only)
app.get('/create-test-orders', requireAdmin, async (req, res) => {
    try {
        const User = require('./models/User');
        const Order = require('./models/Order');
        
        // Get admin user
        const adminUser = await User.findOne({ email: 'admin@ascentaqua.com' });
        const products = await Product.find();
        
        if (!adminUser || products.length === 0) {
            return res.json({ error: 'Need admin user and products first' });
        }
        
        // Create some test orders
        const testOrders = [
            {
                user: adminUser._id,
                items: [{
                    product: products[0]._id,
                    name: products[0].name,
                    price: products[0].price,
                    quantity: 2
                }],
                totalAmount: products[0].price * 2,
                shippingAddress: {
                    name: 'Test User',
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'Test Country',
                    phone: '1234567890'
                },
                status: 'confirmed',
                paymentStatus: 'paid'
            }
        ];
        
        await Order.deleteMany({}); // Clear existing orders
        await Order.insertMany(testOrders);
        
        res.json({
            message: 'Test orders created successfully',
            ordersCreated: testOrders.length
        });
    } catch (error) {
        console.error('Test orders error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Admin Orders
app.get('/admin/orders', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const orders = await Order.find()
            .populate('user')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('pages/admin/orders', {
            orders,
            currentPage: page,
            totalPages,
            cartCount: 0
        });
    } catch (error) {
        console.error(error);
        res.render('pages/error', { 
            message: 'Error loading orders',
            cartCount: 0
        });
    }
});

// Update Order Status
app.post('/admin/orders/:id/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await Order.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});


app.get('/admin/products/create', requireAdmin, (req, res) => {
    res.render('pages/admin/product-form', {
        user: req.session.user,
        product: null,
        errors: [],
        formData: {},
        cartCount: 0,
        messages: {} // Add empty messages object
    });
});

// Edit Product Page - Fixed
app.get('/admin/products/:id/edit', requireAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.redirect('/admin/products');
        }
        res.render('pages/admin/product-form', {
            user: req.session.user,
            product: product,
            errors: [],
            formData: {},
            cartCount: 0,
            messages: {} // Add empty messages object
        });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/products');
    }
});

// Create Product - Fixed
// Create Product with Cloudinary - Debug version
app.post('/admin/products', requireAdmin, upload.single('image'), [
    // your validation rules
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('pages/admin/product-form', {
            user: req.session.user,
            product: null,
            errors: errors.array(),
            formData: req.body,
            cartCount: 0
        });
    }

    try {
        const productData = { ...req.body };
        
        // Handle features array
        if (productData.features) {
            if (typeof productData.features === 'string') {
                productData.features = productData.features.split(',').map(f => f.trim()).filter(f => f);
            }
        }
        
        // Debug Cloudinary upload
        console.log('File upload info:', req.file);
        
        // Handle Cloudinary image - IMPORTANT: req.file.path contains the Cloudinary URL
        if (req.file) {
            productData.image = req.file.path;
            console.log('Cloudinary URL stored:', productData.image);
        } else {
            console.log('No image file uploaded');
        }
        
        // Convert inStock to boolean
        productData.inStock = productData.inStock === 'true';
        
        const product = new Product(productData);
        await product.save();
        
        console.log('Product saved to database:', product);
        
        req.flash('success_msg', 'Product created successfully!');
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error creating product:', error);
        res.render('pages/admin/product-form', {
            user: req.session.user,
            product: null,
            errors: [{ msg: 'Error creating product: ' + error.message }],
            formData: req.body,
            cartCount: 0
        });
    }
});


app.get('/admin/products', requireAdmin, async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.render('pages/admin/products', {
            products,
            cartCount: 0
        });
    } catch (error) {
        console.error(error);
        res.render('pages/error', { 
            message: 'Error loading products',
            cartCount: 0
        });
    }
});

// Create Product Page



// Update Product with Cloudinary
app.post('/admin/products/:id', requireAdmin, upload.single('image'), [
    body('name').notEmpty().withMessage('Product name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('capacity').notEmpty().withMessage('Capacity is required'),
    body('material').notEmpty().withMessage('Material is required'),
    body('weight').notEmpty().withMessage('Weight is required'),
    body('dimensions').notEmpty().withMessage('Dimensions are required'),
    body('color').notEmpty().withMessage('Color is required')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const product = await Product.findById(req.params.id);
        return res.render('pages/admin/product-form', {
            user: req.session.user,
            product,
            errors: errors.array(),
            formData: req.body,
            cartCount: 0
        });
    }

    try {
        const productData = { ...req.body };
        
        // Handle features array
        if (productData.features) {
            if (typeof productData.features === 'string') {
                productData.features = productData.features.split(',').map(f => f.trim()).filter(f => f);
            }
        }
        
        // Handle Cloudinary image
        if (req.file) {
            productData.image = req.file.path;
        }
        
        // Convert inStock to boolean
        productData.inStock = productData.inStock === 'true';
        
        await Product.findByIdAndUpdate(req.params.id, productData);
        
        req.flash('success_msg', 'Product updated successfully!');
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        const product = await Product.findById(req.params.id);
        res.render('pages/admin/product-form', {
            user: req.session.user,
            product,
            errors: [{ msg: 'Error updating product: ' + error.message }],
            formData: req.body,
            cartCount: 0
        });
    }
});

// Delete Product
app.post('/admin/products/:id/delete', requireAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
const Message = require('./models/Message');

// Handle contact form submission
app.post('/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        // Save message to database
        const newMessage = new Message({
            name,
            email,
            message
        });
        
        await newMessage.save();
        
        res.json({ 
            success: true, 
            message: 'Thank you for your message! We will get back to you soon.' 
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error sending message. Please try again.' 
        });
    }
});
// Admin Messages Page
app.get('/admin/messages', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const messages = await Message.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalMessages = await Message.countDocuments();
        const totalPages = Math.ceil(totalMessages / limit);

        res.render('pages/admin/messages', {
            user: req.session.user,
            messages,
            currentPage: page,
            totalPages,
            cartCount: 0
        });
    } catch (error) {
        console.error(error);
        res.render('pages/error', { 
            message: 'Error loading messages',
            user: req.session.user,
            cartCount: 0
        });
    }
});

// Update message status
app.post('/admin/messages/:id/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await Message.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update message status' });
    }
});

// Delete message
app.post('/admin/messages/:id/delete', requireAdmin, async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});
// Home Page Route - Fix this

// Auth Routes
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('auth/login', { error: null });
});

// Login User - Fix admin authentication
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.render('auth/login', { error: 'Invalid email or password' });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.render('auth/login', { error: 'Invalid email or password' });
        }

        // Set session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        // Redirect based on user type
        if (user.email === 'admin@ascentaqua.com') {
            return res.redirect('/admin');
        } else {
            return res.redirect('/');
        }

    } catch (error) {
        console.error(error);
        res.render('auth/login', { error: 'Server error. Please try again.' });
    }
});
app.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('auth/register', { errors: [], formData: {} });
});

app.post('/register', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').notEmpty().withMessage('Phone number is required')
], async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.render('auth/register', { errors: errors.array(), formData: req.body });
    }

    try {
        const { name, email, password, phone } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('auth/register', {
                errors: [{ msg: 'User already exists' }],
                formData: req.body
            });
        }

        const user = new User({ name, email, password, phone });
        await user.save();

        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('auth/register', {
            errors: [{ msg: 'Server error' }],
            formData: req.body
        });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Cart Routes
app.get('/cart', requireAuth, (req, res) => {
    const cart = req.session.cart || [];
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.render('pages/cart', { 
        cart,
        total,
        cartCount: cart.length
    });
});

app.post('/cart/add', requireAuth, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let cart = req.session.cart || [];
        const existingItem = cart.find(item => item.productId === productId);
        
        if (existingItem) {
            existingItem.quantity += parseInt(quantity);
        } else {
            cart.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: parseInt(quantity),
                image: product.image,
                capacity: product.capacity
            });
        }

        req.session.cart = cart;
        res.json({ success: true, cartCount: cart.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/cart/update', requireAuth, (req, res) => {
    const { productId, quantity } = req.body;
    let cart = req.session.cart || [];
    
    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity = parseInt(quantity);
        if (item.quantity <= 0) {
            req.session.cart = cart.filter(item => item.productId !== productId);
        } else {
            req.session.cart = cart;
        }
    }
    
    res.json({ success: true, cartCount: req.session.cart.length });
});

app.post('/cart/remove', requireAuth, (req, res) => {
    const { productId } = req.body;
    req.session.cart = (req.session.cart || []).filter(item => item.productId !== productId);
    res.json({ success: true, cartCount: req.session.cart.length });
});

// Checkout Routes
app.get('/checkout', requireAuth, (req, res) => {
    const cart = req.session.cart || [];
    if (cart.length === 0) return res.redirect('/cart');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.render('pages/checkout', {
        cart,
        total,
        cartCount: cart.length
    });
});

app.post('/checkout', requireAuth, async (req, res) => {
    try {
        const { name, street, city, state, zipCode, country, phone } = req.body;
        const cart = req.session.cart || [];
        
        if (cart.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const order = new Order({
            user: req.session.user.id,
            items: cart.map(item => ({
                product: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            totalAmount,
            shippingAddress: { name, street, city, state, zipCode, country, phone }
        });

        await order.save();
        
        // Clear cart
        req.session.cart = [];
        
        res.json({ 
            success: true, 
            orderId: order._id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to place order' });
    }
});

app.get('/order-success/:id', requireAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user');
        res.render('pages/order-success', { 
            order,
            cartCount: 0
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

// Orders History
app.get('/orders', requireAuth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.session.user.id })
            .sort({ createdAt: -1 });
        
        res.render('pages/orders', { 
            orders,
            cartCount: req.session.cart ? req.session.cart.length : 0
        });
    } catch (error) {
        console.error(error);
        res.render('pages/orders', { orders: [] });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`AscentAqua server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});