# Authentication & User Management System

This document describes the new authentication and user management features added to the Chess Tournament Director system.

## 🔐 **New Features Implemented**

### **1. User Authentication System**
- **JWT-based authentication** with secure token management
- **Password hashing** using bcryptjs with salt rounds
- **Session management** with token expiration
- **Role-based access control** (Admin, Tournament Director, User)

### **2. User Management**
- **User registration** with email validation
- **Profile management** (update personal information)
- **Password management** (change password, admin reset)
- **User roles** with different permission levels
- **Account activation/deactivation**

### **3. Security Features**
- **Rate limiting** to prevent brute force attacks
- **Helmet.js** for security headers
- **Input validation** and sanitization
- **Audit logging** for all user actions
- **CORS protection** with configurable origins

### **4. Tournament Permissions**
- **Tournament ownership** system
- **Permission levels**: Owner, Editor, Viewer
- **Multi-user tournament access**
- **Permission inheritance** and delegation

### **5. Data Management**
- **Automated backup system** with scheduled cleanup
- **Tournament export/import** functionality
- **Database restoration** from backups
- **Audit trail** for all changes

### **6. Tournament Templates**
- **Template creation** and management
- **Public/private templates**
- **Template-based tournament creation**
- **Template sharing** between users

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
npm run install-all
```

### **2. Set Up Environment Variables**
Create `.env` file in the root directory:
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

### **3. Create Admin User**
```bash
npm run setup
```

This creates an admin user with:
- **Username**: admin
- **Email**: admin@chess-tournament.com
- **Password**: admin123

⚠️ **IMPORTANT**: Change the admin password immediately after first login!

### **4. Start the Application**
```bash
npm run dev
```

## 👥 **User Roles & Permissions**

### **Admin**
- Full system access
- User management (create, edit, delete users)
- System backup and restore
- All tournament permissions
- Audit log access

### **Tournament Director (TD)**
- Create and manage tournaments
- Access to backup system
- User management (limited)
- Template management

### **User**
- View public tournaments
- Limited tournament access (if granted permission)
- Profile management

## 🔧 **API Endpoints**

### **Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user

### **User Management (Admin Only)**
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/reset-password` - Reset user password

### **Tournament Templates**
- `GET /api/templates` - Get all templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:id/create-tournament` - Create tournament from template

### **Backup & Restore**
- `POST /api/backup/create` - Create database backup
- `GET /api/backup/list` - List available backups
- `GET /api/backup/download/:fileName` - Download backup
- `POST /api/backup/restore` - Restore from backup
- `DELETE /api/backup/:fileName` - Delete backup
- `POST /api/backup/export-tournament` - Export tournament
- `GET /api/backup/export/:fileName` - Download tournament export

## 🛡️ **Security Features**

### **Rate Limiting**
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP

### **Password Security**
- Minimum 8 characters
- Bcrypt hashing with 12 salt rounds
- Password change requires current password verification

### **Input Validation**
- Email format validation
- Username length validation
- SQL injection prevention
- XSS protection

### **Audit Logging**
All user actions are logged with:
- User ID and IP address
- Action performed
- Timestamp
- Old and new values (for updates)

## 📊 **Database Schema**

### **New Tables Added**
- `users` - User accounts and profiles
- `user_sessions` - JWT token management
- `tournament_permissions` - Tournament access control
- `audit_log` - System audit trail
- `tournament_templates` - Tournament templates

## 🔄 **Migration from Old System**

The new authentication system is backward compatible. Existing tournaments will:
1. Be accessible to all users initially
2. Need permission assignment for proper access control
3. Maintain all existing functionality

## 🚨 **Important Security Notes**

1. **Change Default Admin Password**: The default admin password must be changed immediately
2. **JWT Secret**: Use a strong, unique JWT secret in production
3. **HTTPS**: Always use HTTPS in production
4. **Regular Backups**: Set up automated backup schedules
5. **Monitor Audit Logs**: Regularly review audit logs for suspicious activity

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"Access token required"**
   - User not logged in
   - Token expired
   - Invalid token format

2. **"Insufficient permissions"**
   - User role doesn't have required permissions
   - Tournament permission not granted

3. **"User not found"**
   - User account deactivated
   - Invalid user ID

4. **"Too many requests"**
   - Rate limit exceeded
   - Wait 15 minutes or check rate limiting configuration

### **Reset Admin Password**
If you lose admin access:
1. Stop the server
2. Run: `node server/scripts/create-admin.js`
3. Login with new credentials
4. Change password immediately

## 📈 **Next Steps**

1. **Set up automated backups** with cron jobs
2. **Configure email notifications** for user actions
3. **Implement password reset** via email
4. **Add two-factor authentication**
5. **Set up monitoring** and alerting

## 🤝 **Support**

For issues or questions about the authentication system:
1. Check the audit logs for error details
2. Review the console logs for debugging information
3. Ensure all environment variables are properly set
4. Verify database permissions and connectivity
