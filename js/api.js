// RecycleHub API Client
class RecycleHubAPI {
    constructor() {
        // Auto-detect environment and set appropriate API URL
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        this.baseURL = isProduction 
            ? 'https://kiritodark2k6.github.io/RecycleHub/js/api.js'  // Thay bằng URL backend production của bạn
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
            const response = await fetch(`${this.baseURL}/auth/register`, {
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
            const response = await fetch(`${this.baseURL}/auth/login`, {
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
            const response = await fetch(`${this.baseURL}/auth/me`, {
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
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
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
                await fetch(`${this.baseURL}/auth/logout`, {
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
            const response = await fetch(`${this.baseURL}/user/profile`, {
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
            const response = await fetch(`${this.baseURL}/user/change-password`, {
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
            const response = await fetch(`${this.baseURL}/user/stats`, {
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
            const response = await fetch(`${this.baseURL}/user/leaderboard?${params}`, {
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
            const response = await fetch(`${this.baseURL}/user/account`, {
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
            const response = await fetch(`${this.baseURL}/health`);
            return await this.handleResponse(response);
        } catch (error) {
            throw new Error('Server không khả dụng');
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
