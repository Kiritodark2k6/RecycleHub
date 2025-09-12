const express = require('express');
const { body, validationResult } = require('express-validator');
const RecycleTransaction = require('../models/RecycleTransaction');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper function để xử lý validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu đầu vào không hợp lệ',
            errors: errors.array()
        });
    }
    next();
};

// @route   POST /api/recycle/submit
// @desc    Đăng ký đổi rác lấy điểm
// @access  Private
router.post('/submit', [
    body('plasticType')
        .isIn(['pet', 'bag', 'box', 'mixed'])
        .withMessage('Loại nhựa không hợp lệ'),
    body('weight')
        .isFloat({ min: 0.1, max: 1000 })
        .withMessage('Trọng lượng phải từ 0.1kg đến 1000kg'),
    body('location')
        .trim()
        .isLength({ min: 10, max: 200 })
        .withMessage('Địa chỉ phải từ 10-200 ký tự'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Ghi chú không được vượt quá 500 ký tự')
], handleValidationErrors, authenticateToken, async (req, res) => {
    try {
        const { plasticType, weight, location, notes, images } = req.body;
        const userId = req.user._id;

        // Tạo transaction mới
        const transaction = new RecycleTransaction({
            userId,
            plasticType,
            weight,
            location,
            notes: notes || '',
            images: images || [],
            pricePerKg: 10000 // 10,000 VND/kg
        });

        // Tính điểm và earnings
        const calculations = transaction.calculatePointsAndEarnings();
        
        // Lưu transaction
        await transaction.save();

        res.status(201).json({
            success: true,
            message: 'Đăng ký đổi rác thành công! Chúng tôi sẽ liên hệ để xác nhận.',
            data: {
                transaction: {
                    id: transaction._id,
                    plasticType: transaction.plasticType,
                    weight: transaction.weight,
                    points: transaction.points,
                    bonusPoints: transaction.bonusPoints,
                    totalPoints: transaction.totalPoints,
                    totalEarnings: transaction.totalEarnings,
                    status: transaction.status,
                    createdAt: transaction.createdAt
                }
            }
        });

    } catch (error) {
        console.error('Submit recycle error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng ký đổi rác'
        });
    }
});

// @route   GET /api/recycle/history
// @desc    Lấy lịch sử đổi rác của user
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const userId = req.user._id;

        let query = { userId };
        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const transactions = await RecycleTransaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await RecycleTransaction.countDocuments(query);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalTransactions: total,
                    hasNext: skip + transactions.length < total,
                    hasPrev: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error('Get recycle history error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy lịch sử đổi rác'
        });
    }
});

// @route   GET /api/recycle/stats
// @desc    Lấy thống kê đổi rác của user
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;

        // Lấy thống kê từ RecycleTransaction
        const recycleStats = await RecycleTransaction.getStats(userId);
        
        // Lấy thông tin user hiện tại
        const user = await User.findById(userId).select('stats currentPoints');

        res.json({
            success: true,
            data: {
                recycleStats,
                userStats: user.stats,
                currentPoints: user.currentPoints
            }
        });

    } catch (error) {
        console.error('Get recycle stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê đổi rác'
        });
    }
});

// @route   GET /api/recycle/calculate
// @desc    Tính điểm dựa trên trọng lượng (không lưu)
// @access  Public
router.get('/calculate', [
    body('weight')
        .isFloat({ min: 0.1, max: 1000 })
        .withMessage('Trọng lượng phải từ 0.1kg đến 1000kg'),
    body('plasticType')
        .optional()
        .isIn(['pet', 'bag', 'box', 'mixed'])
        .withMessage('Loại nhựa không hợp lệ')
], handleValidationErrors, async (req, res) => {
    try {
        const { weight, plasticType = 'mixed' } = req.query;
        const weightNum = parseFloat(weight);

        // Tính điểm
        const basePoints = weightNum * 10; // 10 điểm/kg
        const bonusPoints = weightNum >= 10 ? (weightNum - 10) * 1 : 0; // +1 điểm/kg từ 10kg trở lên
        const totalPoints = basePoints + bonusPoints;
        
        // Tính earnings (1 điểm = 1000 VND)
        const totalEarnings = totalPoints * 1000;

        res.json({
            success: true,
            data: {
                weight: weightNum,
                plasticType,
                points: Math.floor(basePoints),
                bonusPoints: Math.floor(bonusPoints),
                totalPoints: Math.floor(totalPoints),
                totalEarnings: Math.floor(totalEarnings),
                hasBonus: weightNum >= 10,
                bonusMessage: weightNum >= 10 ? 
                    `Bạn nhận được ${Math.floor(bonusPoints)} điểm bonus vì có từ 10kg trở lên!` : 
                    'Cần ít nhất 10kg để nhận điểm bonus'
            }
        });

    } catch (error) {
        console.error('Calculate points error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tính điểm'
        });
    }
});

// @route   PUT /api/recycle/:id/confirm
// @desc    Xác nhận giao dịch đổi rác (Admin only)
// @access  Private/Admin
router.put('/:id/confirm', authenticateToken, async (req, res) => {
    try {
        const transactionId = req.params.id;
        const transaction = await RecycleTransaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giao dịch'
            });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Giao dịch đã được xử lý'
            });
        }

        // Xác nhận giao dịch
        await transaction.confirm();

        res.json({
            success: true,
            message: 'Xác nhận giao dịch thành công',
            data: {
                transaction: {
                    id: transaction._id,
                    status: transaction.status,
                    confirmedAt: transaction.confirmedAt
                }
            }
        });

    } catch (error) {
        console.error('Confirm transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xác nhận giao dịch'
        });
    }
});

// @route   PUT /api/recycle/:id/complete
// @desc    Hoàn thành giao dịch đổi rác (Admin only)
// @access  Private/Admin
router.put('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const transactionId = req.params.id;
        const transaction = await RecycleTransaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giao dịch'
            });
        }

        if (transaction.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: 'Giao dịch chưa được xác nhận'
            });
        }

        // Hoàn thành giao dịch
        await transaction.complete();

        res.json({
            success: true,
            message: 'Hoàn thành giao dịch thành công',
            data: {
                transaction: {
                    id: transaction._id,
                    status: transaction.status,
                    completedAt: transaction.completedAt
                }
            }
        });

    } catch (error) {
        console.error('Complete transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi hoàn thành giao dịch'
        });
    }
});

// @route   GET /api/recycle/all
// @desc    Lấy tất cả giao dịch (Admin only)
// @access  Private/Admin
router.get('/all', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, plasticType } = req.query;
        
        let query = {};
        if (status) query.status = status;
        if (plasticType) query.plasticType = plasticType;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const transactions = await RecycleTransaction.find(query)
            .populate('userId', 'fullName email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await RecycleTransaction.countDocuments(query);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalTransactions: total,
                    hasNext: skip + transactions.length < total,
                    hasPrev: parseInt(page) > 1
                }
            }
        });

    } catch (error) {
        console.error('Get all transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách giao dịch'
        });
    }
});

module.exports = router;
