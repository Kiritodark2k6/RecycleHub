const mongoose = require('mongoose');

const recycleTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plasticType: {
        type: String,
        enum: ['pet', 'bag', 'box', 'mixed'],
        required: true
    },
    weight: {
        type: Number,
        required: true,
        min: 0.1, // Tối thiểu 0.1kg
        max: 1000 // Tối đa 1000kg
    },
    points: {
        type: Number,
        required: true,
        min: 0
    },
    bonusPoints: {
        type: Number,
        default: 0
    },
    totalPoints: {
        type: Number,
        required: true,
        min: 0
    },
    pricePerKg: {
        type: Number,
        required: true,
        min: 0
    },
    totalEarnings: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500
    },
    images: [{
        type: String, // URL của ảnh
        trim: true
    }],
    confirmedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes
recycleTransactionSchema.index({ userId: 1, createdAt: -1 });
recycleTransactionSchema.index({ status: 1 });
recycleTransactionSchema.index({ plasticType: 1 });

// Virtual để tính điểm dựa trên trọng lượng
recycleTransactionSchema.virtual('calculatedPoints').get(function() {
    const basePoints = this.weight * 10; // 10 điểm/kg
    const bonusPoints = this.weight >= 10 ? (this.weight - 10) * 1 : 0; // +1 điểm/kg từ 10kg trở lên
    return basePoints + bonusPoints;
});

// Method để tính điểm và earnings
recycleTransactionSchema.methods.calculatePointsAndEarnings = function() {
    const basePoints = this.weight * 10; // 10 điểm/kg
    const bonusPoints = this.weight >= 10 ? (this.weight - 10) * 1 : 0; // +1 điểm/kg từ 10kg trở lên
    const totalPoints = basePoints + bonusPoints;
    
    // Tính giá tiền (giả sử 1 điểm = 1000 VND)
    const totalEarnings = totalPoints * 1000;
    
    this.points = basePoints;
    this.bonusPoints = bonusPoints;
    this.totalPoints = totalPoints;
    this.totalEarnings = totalEarnings;
    
    return {
        points: this.points,
        bonusPoints: this.bonusPoints,
        totalPoints: this.totalPoints,
        totalEarnings: this.totalEarnings
    };
};

// Method để xác nhận giao dịch
recycleTransactionSchema.methods.confirm = async function() {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
    await this.save();
    
    // Cập nhật điểm cho user
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(this.userId, {
        $inc: {
            'stats.totalPoints': this.totalPoints,
            'stats.totalEarnings': this.totalEarnings,
            'stats.totalKg': this.weight,
            'stats.totalTransactions': 1
        }
    });
    
    return this;
};

// Method để hoàn thành giao dịch
recycleTransactionSchema.methods.complete = async function() {
    this.status = 'completed';
    this.completedAt = new Date();
    await this.save();
    return this;
};

// Method để hủy giao dịch
recycleTransactionSchema.methods.cancel = async function() {
    this.status = 'cancelled';
    await this.save();
    return this;
};

// Static method để lấy thống kê
recycleTransactionSchema.statics.getStats = async function(userId = null) {
    const matchStage = userId ? { userId: mongoose.Types.ObjectId(userId) } : {};
    
    const stats = await this.aggregate([
        { $match: { ...matchStage, status: 'completed' } },
        {
            $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalWeight: { $sum: '$weight' },
                totalPoints: { $sum: '$totalPoints' },
                totalEarnings: { $sum: '$totalEarnings' },
                avgWeight: { $avg: '$weight' },
                avgPoints: { $avg: '$totalPoints' }
            }
        }
    ]);
    
    return stats[0] || {
        totalTransactions: 0,
        totalWeight: 0,
        totalPoints: 0,
        totalEarnings: 0,
        avgWeight: 0,
        avgPoints: 0
    };
};

// Static method để lấy lịch sử giao dịch
recycleTransactionSchema.statics.getUserHistory = async function(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const transactions = await this.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email phone');
    
    const total = await this.countDocuments({ userId });
    
    return {
        transactions,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalTransactions: total,
            hasNext: skip + transactions.length < total,
            hasPrev: page > 1
        }
    };
};

module.exports = mongoose.model('RecycleTransaction', recycleTransactionSchema);
