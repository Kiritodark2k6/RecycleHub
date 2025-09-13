const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID là bắt buộc']
    },
    type: {
        type: String,
        enum: ['waste_exchange', 'daily_checkin', 'bonus', 'redemption'],
        required: [true, 'Loại giao dịch là bắt buộc']
    },
    wasteAmount: {
        type: Number,
        min: [0, 'Số kg rác không được âm'],
        default: 0
    },
    pointsEarned: {
        type: Number,
        required: [true, 'Số điểm nhận được là bắt buộc'],
        min: [0, 'Số điểm không được âm']
    },
    pointsBefore: {
        type: Number,
        required: [true, 'Số điểm trước giao dịch là bắt buộc'],
        min: [0, 'Số điểm không được âm']
    },
    pointsAfter: {
        type: Number,
        required: [true, 'Số điểm sau giao dịch là bắt buộc'],
        min: [0, 'Số điểm không được âm']
    },
    description: {
        type: String,
        required: [true, 'Mô tả giao dịch là bắt buộc'],
        maxlength: [500, 'Mô tả không được vượt quá 500 ký tự']
    },
    location: {
        type: String,
        maxlength: [200, 'Địa điểm không được vượt quá 200 ký tự']
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'completed'
    },
    metadata: {
        // Thêm thông tin bổ sung như loại rác, hình ảnh, v.v.
        plasticType: {
            type: String,
            enum: ['pet', 'bag', 'box', 'all', ''],
            default: ''
        },
        bonusApplied: {
            type: Boolean,
            default: false
        },
        bonusAmount: {
            type: Number,
            default: 0
        },
        checkinStreak: {
            type: Number,
            default: 0
        }
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Admin user who processed this transaction
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual field để tính điểm trung bình per kg
transactionSchema.virtual('pointsPerKg').get(function() {
    if (this.wasteAmount > 0) {
        return Math.round((this.pointsEarned / this.wasteAmount) * 100) / 100;
    }
    return 0;
});

// Index để tối ưu hóa truy vấn
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });

// Static method để tính điểm dựa trên số kg rác
transactionSchema.statics.calculatePoints = function(wasteAmount) {
    const amount = parseFloat(wasteAmount) || 0;
    let points = 0;
    let bonus = false;
    let bonusAmount = 0;

    if (amount > 0) {
        // Base points: 10 points per kg
        points = amount * 10;
        
        // Bonus: +1 point per kg if >= 10kg
        if (amount >= 10) {
            bonusAmount = amount; // +1 bonus point per kg
            points += bonusAmount;
            bonus = true;
        }
    }

    return {
        basePoints: amount * 10,
        bonusPoints: bonusAmount,
        totalPoints: Math.floor(points),
        hasBonus: bonus
    };
};

// Static method để lấy thống kê giao dịch của user
transactionSchema.statics.getUserStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId), status: 'completed' } },
        {
            $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalWasteKg: { $sum: '$wasteAmount' },
                totalPointsEarned: { $sum: '$pointsEarned' },
                totalBonusPoints: { $sum: '$metadata.bonusAmount' },
                avgPointsPerKg: { $avg: '$pointsPerKg' }
            }
        }
    ]);

    return stats[0] || {
        totalTransactions: 0,
        totalWasteKg: 0,
        totalPointsEarned: 0,
        totalBonusPoints: 0,
        avgPointsPerKg: 0
    };
};

// Method để lấy thông tin giao dịch chi tiết
transactionSchema.methods.getDetails = function() {
    return {
        id: this._id,
        type: this.type,
        wasteAmount: this.wasteAmount,
        pointsEarned: this.pointsEarned,
        pointsBefore: this.pointsBefore,
        pointsAfter: this.pointsAfter,
        description: this.description,
        location: this.location,
        status: this.status,
        metadata: this.metadata,
        createdAt: this.createdAt,
        pointsPerKg: this.pointsPerKg
    };
};

module.exports = mongoose.model('Transaction', transactionSchema);
