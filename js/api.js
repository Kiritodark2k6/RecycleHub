// RecycleHub API Client
class RecycleHubAPI {
    constructor() {
        // Auto-detect environment and set appropriate API URL
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        this.baseURL = isProduction 
            ? 'recyclehub-production-aba0.up.railway.app/api'  // Thay bằng URL backend production của bạn
            : 'http://localhost:5000/api';
        this.token = localStorage.getItem('recyclehub_token');
    }

    // Helper method để tạo headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Helper method để xử lý response
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Có lỗi xảy ra');
        }
        
        return data;
    }

    // Authentication methods
    async register(userData) {
        try {
           const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/auth/register', {
                method: 'POST',
                headers: this.getHeaders(false),
                body: JSON.stringify(userData)
            });

            const result = await this.handleResponse(response);
            
            if (result.success && result.data.token) {
                this.token = result.data.token;
                localStorage.setItem('recyclehub_token', this.token);
                localStorage.setItem('recyclehub_user', JSON.stringify(result.data.user));
            }
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async login(loginData) {
        try {
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: this.getHeaders(false),
                body: JSON.stringify(loginData)
            });

            const result = await this.handleResponse(response);
            
            if (result.success && result.data.token) {
                this.token = result.data.token;
                localStorage.setItem('recyclehub_token', this.token);
                localStorage.setItem('recyclehub_user', JSON.stringify(result.data.user));
            }
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getCurrentUser() {
        try {
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/auth/me', {
                method: 'GET',
                headers: this.getHeaders()
            });

            const result = await this.handleResponse(response);
            
            if (result.success) {
                localStorage.setItem('recyclehub_user', JSON.stringify(result.data.user));
            }
            
            return result;
        } catch (error) {
            // Nếu token không hợp lệ, xóa token và user data
            this.logout();
            throw new Error(error.message);
        }
    }

    async refreshToken() {
        try {
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/auth/refresh', {
                method: 'POST',
                headers: this.getHeaders()
            });

            const result = await this.handleResponse(response);
            
            if (result.success && result.data.token) {
                this.token = result.data.token;
                localStorage.setItem('recyclehub_token', this.token);
            }
            
            return result;
        } catch (error) {
            this.logout();
            throw new Error(error.message);
        }
    }

    async logout() {
        try {
            if (this.token) {
                await fetch('https://recyclehub-production-aba0.up.railway.app/api/auth/logout', {
                    method: 'POST',
                    headers: this.getHeaders()
                });
            }
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            // Luôn xóa token và user data
            this.token = null;
            localStorage.removeItem('recyclehub_token');
            localStorage.removeItem('recyclehub_user');
        }
    }

    // User management methods
    async updateProfile(profileData) {
        try {
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/user/profile', {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(profileData)
            });

            const result = await this.handleResponse(response);
            
            if (result.success) {
                localStorage.setItem('recyclehub_user', JSON.stringify(result.data.user));
            }
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async changePassword(passwordData) {
        try {
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/user/change-password', {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(passwordData)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getUserStats() {
        try {
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/user/stats', {
                method: 'GET',
                headers: this.getHeaders()
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getLeaderboard(options = {}) {
        try {
            const params = new URLSearchParams(options);
            const response = await fetch(`https://recyclehub-production-aba0.up.railway.app/api/user/leaderboard?${params}`, {
                method: 'GET',
                headers: this.getHeaders(false)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async deleteAccount() {
        try {
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/user/account', {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            const result = await this.handleResponse(response);
            
            if (result.success) {
                this.logout();
            }
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/health');
            return await this.handleResponse(response);
        } catch (error) {
            throw new Error('Server không khả dụng');
        }
    }
    // Recycle methods
    async submitRecycle(recycleData) {
        try {
            console.log('🔄 Đang gửi request đổi rác...', recycleData);
            
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/recycle/submit', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(recycleData)
            });

            console.log('📊 Response status:', response.status);
            const result = await this.handleResponse(response);
            
            return result;
        } catch (error) {
            console.error('❌ Lỗi đổi rác:', error);
            throw new Error(`Đổi rác thất bại: ${error.message}`);
        }
    }

    async getRecycleHistory(options = {}) {
        try {
            const params = new URLSearchParams(options);
            const response = await fetch(`https://recyclehub-production-aba0.up.railway.app/api/recycle/history?${params}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getRecycleStats() {
        try {
            const response = await fetch('https://recyclehub-production-aba0.up.railway.app/api/recycle/stats', {
                method: 'GET',
                headers: this.getHeaders()
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async calculatePoints(weight, plasticType = 'mixed') {
        try {
            const params = new URLSearchParams({ weight, plasticType });
            const response = await fetch(`https://recyclehub-production-aba0.up.railway.app/api/recycle/calculate?${params}`, {
                method: 'GET',
                headers: this.getHeaders(false)
            });

            return await this.handleResponse(response);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // Utility methods
    isLoggedIn() {
        return !!this.token;
    }

    getCurrentUserData() {
        const userData = localStorage.getItem('recyclehub_user');
        return userData ? JSON.parse(userData) : null;
    }

    // Initialize token from localStorage
    init() {
        this.token = localStorage.getItem('recyclehub_token');
    }
}

// Tạo instance global
window.RecycleHubAPI = new RecycleHubAPI();
