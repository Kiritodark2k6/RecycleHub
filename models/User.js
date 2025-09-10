const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Họ và tên là bắt buộc'],
        trim: true,
        maxlength: [100, 'Họ và tên không được vượt quá 100 ký tự']
    },
    email: {
        type: String,
        required: [true, 'Email là bắt buộc'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
    },
    phone: {
        type: String,
        required: [true, 'Số điện thoại là bắt buộc'],
        unique: true,
        trim: true,
        match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ']
    },
    password: {
        type: String,
        required: [true, 'Mật khẩu là bắt buộc'],
        minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
        select: false // Không trả về password trong query mặc định
    },
    address: {
        type: String,
        required: [true, 'Địa chỉ là bắt buộc'],
        trim: true,
        maxlength: [500, 'Địa chỉ không được vượt quá 500 ký tự']
    },
    plasticType: {
        type: String,
        enum: ['pet', 'bag', 'box', 'all', ''],
        default: ''
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    stats: {
        totalKg: {
            type: Number,
            default: 0
        },
        totalEarnings: {
            type: Number,
            default: 0
        },
        totalOrders: {
            type: Number,
            default: 0
        }
    },
    lastLogin: {
        type: Date,
        default: null
    }
}, {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual field để tính điểm thân thiện môi trường
userSchema.virtual('ecoScore').get(function() {
    const kg = this.stats.totalKg || 0;
    if (kg >= 1000) return 'Diamond';
    if (kg >= 500) return 'Gold';
    if (kg >= 100) return 'Silver';
    if (kg >= 10) return 'Bronze';
    return 'Newbie';
});

// Hash password trước khi lưu
userSchema.pre('save', async function(next) {
    // Chỉ hash password nếu nó được modify
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password với salt rounds = 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method để so sánh password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method để lấy thông tin user (không bao gồm password)
userSchema.methods.getPublicProfile = function() {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

// Index để tối ưu hóa tìm kiếm (email và phone đã có unique index)
userSchema.index({ createdAt: -1 });

// Static method để tìm user theo email hoặc phone
userSchema.statics.findByEmailOrPhone = function(identifier) {
    return this.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { phone: identifier }
        ]
    }).select('+password'); // Bao gồm password để so sánh
};

module.exports = mongoose.model('User', userSchema);
