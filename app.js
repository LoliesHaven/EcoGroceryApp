const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const session = require('express-session');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'mysql-toshiro.alwaysdata.net',
    user: 'toshiro',
    password: 'Lolieshaven1234',
    database: 'toshiro_rp'
});g
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');

// Enable form processing
app.use(express.urlencoded({ extended: false }));

// Enable static files
app.use(express.static('public'));

// Enable session management
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
}));

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
}

function isCustomerAuthenticated(req, res, next) {
    if (req.session.customer) {
        return next();
    } else {
        res.redirect('/customer-login');
    }
}

// Define routes
app.get('/', (req, res) => {
    res.redirect('/signup');
});

app.get('/product/:id', isAuthenticated, (req, res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM products WHERE productId = ?';
    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving product by ID');
        }
        if (results.length > 0) {
            res.render('product', { product: results[0], user: req.session.user });
        } else {
            res.status(404).send('Product not found');
        }
    });
});

app.get('/addProduct', isAuthenticated, (req, res) => {
    res.render('addProduct', { user: req.session.user });
});

app.get('/editProduct/:id', isAuthenticated, (req, res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM products WHERE productId = ?';
    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving product by ID');
        }
        if (results.length > 0) {
            res.render('editProduct', { product: results[0], user: req.session.user });
        } else {
            res.status(404).send('Product not found');
        }
    });
});

app.get('/deleteProduct/:id', isAuthenticated, (req, res) => {
    const productId = req.params.id;
    const sql = 'DELETE FROM products WHERE productId = ?';
    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error('Error deleting product:', error);
            res.status(500).send('Error deleting product');
        } else {
            res.redirect('/');
        }
    });
});

app.post('/addProduct', isAuthenticated, upload.single('image'), (req, res) => {
    const { name, quantity, price } = req.body;
    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }
    const sql = 'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
    connection.query(sql, [name, quantity, price, image], (error, results) => {
        if (error) {
            console.error("Error adding product:", error);
            res.status(500).send('Error adding product');
        } else {
            res.redirect('/');
        }
    });
});

app.post('/editProduct/:id', isAuthenticated, upload.single('image'), (req, res) => {
    const productId = req.params.id;
    const { name, quantity, price } = req.body;
    let image = req.body.currentImage;
    if (req.file) {
        image = req.file.filename;
    }
    const sql = 'UPDATE products SET productName = ? , quantity = ?, price = ?, image = ? WHERE productId = ?';
    connection.query(sql, [name, quantity, price, image, productId], (error, results) => {
        if (error) {
            console.error("Error updating product:", error);
            res.status(500).send('Error updating product');
        } else {
            res.redirect('/');
        }
    });
});

// User Account Routes
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', (req, res) => {
    const { username, password, email, role } = req.body; // Added role

    // Simple validation
    if (!username || !password || !email || !role) { // Check role
        res.send('All fields are required');
        return;
    }

    // Save the user to the database with role
    const sql = 'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)';
    connection.query(sql, [username, password, email, role], (error, results) => {
        if (error) {
            console.error('Error adding user:', error);
            res.status(500).send('Error adding user');
        } else {
            res.redirect('/login');
        }
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    connection.query(sql, [username], (error, results) => {
        if (error) {
            console.error('Error querying user:', error);
            res.status(500).send('Error querying user');
        } else {
            const user = results[0];
            if (user) {
                if (user.password === password) {
                    if (user.role === 'user') {
                        req.session.user = user;
                        res.redirect('/user-dashboard');
                    } else if (user.role === 'customer') {
                        req.session.customer = user;
                        res.redirect('/customer-products');
                    } else {
                        res.send('Invalid role');
                    }
                } else {
                    res.send('Password is incorrect');
                }
            } else {
                res.send('User not found');
            }
        }
    });
});

app.get('/user-dashboard', isAuthenticated, (req, res) => {
    const sql = 'SELECT * FROM products';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving products');
        }
        res.render('index', { products: results, user: req.session.user });
    });
});

app.get('/profile', isAuthenticated, (req, res) => {
    res.render('profile', { user: req.session.user });
});

app.get('/edit-profile', isAuthenticated, (req, res) => {
    res.render('edit-profile', { user: req.session.user });
});

app.post('/edit-profile', isAuthenticated, (req, res) => {
    const { username, password, email } = req.body;
    const userId = req.session.user.id;
    const sql = 'UPDATE users SET username = ?, password = ?, email = ? WHERE id = ?';
    connection.query(sql, [username, password, email, userId], (error, results) => {
        if (error) {
            console.error('Error updating user:', error);
            res.status(500).send('Error updating user');
        } else {
            req.session.user.username = username;
            req.session.user.password = password;
            req.session.user.email = email;
            res.redirect('/profile');
        }
    });
});

app.post('/delete-account', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const sql = 'DELETE FROM users WHERE id = ?';
    connection.query(sql, [userId], (error, results) => {
        if (error) {
            console.error('Error deleting user:', error);
            res.status(500).send('Error deleting user');
        } else {
            req.session.destroy();
            res.redirect('/');
        }
    });
});

// Customer Routes
app.get('/customer-login', (req, res) => {
    res.render('customer-login');
});

app.post('/customer-login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    connection.query(sql, [username], (error, results) => {
        if (error) {
            console.error('Error querying user:', error);
            res.status(500).send('Error querying user');
        } else {
            const user = results[0];
            if (user) {
                if (user.password === password) {
                    req.session.customer = user;
                    res.redirect('/customer-products');
                } else {
                    res.send('Password is incorrect');
                }
            } else {
                res.send('User not found');
            }
        }
    });
});

app.get('/customer-products', isCustomerAuthenticated, (req, res) => {
    const sql = 'SELECT * FROM products';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving products');
        }
        res.render('customer-products', { products: results, user: req.session.customer });
    });
});

app.get('/cart', isCustomerAuthenticated, (req, res) => {
    res.render('cart', { cart: req.session.cart || [], user: req.session.customer });
});

app.post('/cart/add/:id', isCustomerAuthenticated, (req, res) => {
    const productId = req.params.id;
    const quantity = parseInt(req.body.quantity, 10);
    const sql = 'SELECT * FROM products WHERE productId = ?';
    connection.query(sql, [productId], (error, results) => {
        if (error) {
            console.error('Error querying product:', error);
            res.status(500).send('Error querying product');
        } else {
            const product = results[0];
            if (product) {
                const cartItem = { ...product, quantity: quantity, };
                req.session.cart = req.session.cart || [];
                req.session.cart.push(cartItem);
                res.redirect('/cart');
            } else {
                res.status(404).send('Product not found');
            }
        }
    });
});

app.post('/cart/remove/:id', isCustomerAuthenticated, (req, res) => {
    const productId = req.params.id;
    req.session.cart = req.session.cart.filter(item => item.productId !== productId);
    res.redirect('/cart');
});

// Route to display cart
app.get('/cart', isCustomerAuthenticated, (req, res) => {
    // Assuming req.session.cart contains the cart items
    const cartItems = req.session.cart || [];

    // Calculate total
    let total = 0;
    cartItems.forEach(item => {
        total += item.price * item.quantity;
    });

    res.render('cart', { cartItems: cartItems, total: total, user: req.session.customer });
});

// Remove from Cart 
app.post('/removeFromCart', (req, res) => { 
    if (!req.session.userId) { 
        return res.redirect('/cart'); 
    } 
  
    const { productId } = req.body; 
    const userId = req.session.userId; 
  
    
  
    connection.query(sql, [userId, productId], (error) => { 
        if (error) { 
            console.error('Database query error:', error.message); 
            return res.status(500).send('Error removing from cart'); 
        } 
        res.redirect('/cart'); 
    }); 
  });
  




// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
