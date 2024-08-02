const mysql = require('mysql2');

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'c237_supermarketapp'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');

    // Update roles
    const sql = "UPDATE users SET role = 'user' WHERE role = 0";
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Error updating roles:', error);
        } else {
            console.log('Roles updated successfully');
        }
        connection.end();
    });
});
