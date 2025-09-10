const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
const PORT = config.PORT;

// Middleware
app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'file://',
            'null',
            'https://kiritodark2k6.github.io'
        ];
        
        // Check if origin is allowed
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        
        // Allow all GitHub Pages domains
        if (origin && origin.endsWith('.github.io')) {
            return callback(null, true);
        }
        
        // Allow localhost with any port for development
        if (origin && origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }
        
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau.'
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 auth requests per windowMs (tăng từ 5 lên 50)
    message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút.'
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'RecycleHub API đang hoạt động',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Lỗi server nội bộ',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Có lỗi xảy ra'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint không tồn tại'
    });
});

// MongoDB connection
mongoose.connect(config.MONGODB_URI)
.then(() => {
    console.log('✅ Kết nối MongoDB thành công');
    app.listen(PORT, () => {
        console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
})
.catch((error) => {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
});

module.exports = app;
