const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());


// ========================================
// FRONTEND
// ========================================

const frontendPath = path.join(__dirname, '..', 'frontend');

app.use(express.static(frontendPath));


// ========================================
// API ROUTES
// ========================================

const apiRoutes = require('./routes/api');

app.use('/api', apiRoutes);


// ========================================
// OPEN INDEX.HTML
// ========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});


// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {

    console.log('');
    console.log('================================');
    console.log('🚀 SMARTBIN SERVER STARTED');
    console.log('================================');

    console.log(`🌐 Port: ${PORT}`);
    console.log(`📡 API: /api`);

    console.log('================================');
});