# RecycleHub Backend API

Backend API cho hệ thống RecycleHub - Thu mua rác thải nhựa thông minh.

## 🚀 Tính năng

- ✅ Đăng ký/Đăng nhập người dùng
- ✅ Xác thực JWT
- ✅ Quản lý profile người dùng
- ✅ Thống kê và bảng xếp hạng
- ✅ Bảo mật với rate limiting
- ✅ Validation dữ liệu đầu vào
- ✅ Hash mật khẩu với bcrypt

## 📋 Yêu cầu hệ thống

- Node.js >= 16.0.0
- MongoDB >= 4.4
- npm hoặc yarn

## 🛠️ Cài đặt

1. **Clone repository và cài đặt dependencies:**
```bash
npm install
```

2. **Cấu hình MongoDB:**
   - Cài đặt MongoDB local hoặc sử dụng MongoDB Atlas
   - Cập nhật `MONGODB_URI` trong file `config.js`

3. **Chạy server:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔧 Cấu hình

Chỉnh sửa file `config.js` để cấu hình:

```javascript
module.exports = {
    MONGODB_URI: 'mongodb://localhost:27017/recyclehub',
    JWT_SECRET: 'your_secret_key_here',
    JWT_EXPIRE: '7d',
    PORT: 5000,
    FRONTEND_URL: 'http://localhost:3000'
};
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `POST /api/auth/refresh` - Làm mới token
- `POST /api/auth/logout` - Đăng xuất

### User Management
- `GET /api/user/profile` - Lấy profile
- `PUT /api/user/profile` - Cập nhật profile
- `PUT /api/user/change-password` - Đổi mật khẩu
- `GET /api/user/stats` - Lấy thống kê
- `GET /api/user/leaderboard` - Bảng xếp hạng
- `DELETE /api/user/account` - Xóa tài khoản

### System
- `GET /api/health` - Health check

## 🔐 Bảo mật

- JWT authentication
- Password hashing với bcrypt
- Rate limiting
- Input validation
- CORS protection
- Helmet security headers

## 📊 Database Schema

### User Model
```javascript
{
    fullName: String,
    email: String (unique),
    phone: String (unique),
    password: String (hashed),
    address: String,
    plasticType: String,
    role: String (user/admin),
    isActive: Boolean,
    stats: {
        totalKg: Number,
        totalEarnings: Number,
        totalOrders: Number
    },
    lastLogin: Date,
    createdAt: Date,
    updatedAt: Date
}
```

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Nguyễn Văn A",
    "email": "test@example.com",
    "phone": "0123456789",
    "password": "123456",
    "confirmPassword": "123456",
    "address": "123 Đường ABC, Quận 1, TP.HCM",
    "plasticType": "pet",
    "agreeTerms": "true"
  }'
```

## 🚀 Deployment

1. **Production Environment Variables:**
   - `NODE_ENV=production`
   - `MONGODB_URI=mongodb://your-production-db`
   - `JWT_SECRET=your-super-secure-secret`

2. **PM2 (Recommended):**
```bash
npm install -g pm2
pm2 start server.js --name "recyclehub-api"
```

## 📝 Logs

Server logs được ghi vào console với format:
- ✅ Success messages
- ❌ Error messages
- 📊 Info messages

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.
