# Chess Tournament Director

A comprehensive chess tournament management system with React frontend and Node.js backend, featuring Swiss-system pairings, player management, and tournament analytics.

## 🏆 Features

- **Tournament Management**: Create and manage chess tournaments with multiple sections
- **Swiss System Pairings**: Automated pairing algorithm with USCF compliance
- **Player Management**: Add, edit, and search players with rating lookup
- **Real-time Standings**: Live tournament standings with tiebreakers
- **Export Capabilities**: PDF reports, CSV exports, and DBF file generation
- **Responsive Design**: Modern React UI with Tailwind CSS
- **Authentication**: Secure user authentication and authorization

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/chughjug/ratings.git
   cd ratings
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📦 Project Structure

```
ratings/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── services/      # API services
│   │   └── contexts/      # React contexts
├── server/                # Node.js backend
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   └── database.js       # Database configuration
├── uploads/              # File uploads
└── docs/                 # Documentation
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server (both frontend and backend)
- `npm run client` - Start React development server
- `npm run server` - Start Node.js backend server
- `npm run build` - Build React app for production
- `npm start` - Start production server
- `npm run setup` - Create admin user

## 🌐 Deployment

### Heroku Deployment

This application is configured for easy Heroku deployment:

1. **Quick Deploy**
   ```bash
   ./deploy.sh
   ```

2. **Manual Deploy**
   - See `HEROKU_DEPLOYMENT.md` for detailed instructions
   - Or follow `QUICK_DEPLOY.md` for quick reference

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `JWT_SECRET` | JWT token secret | Required |
| `CORS_ORIGIN` | CORS allowed origins | `http://localhost:3000` |

## 🎯 Core Features

### Tournament Management
- Create tournaments with custom settings
- Manage multiple tournament sections
- Set time controls and prize structures
- Export tournament data in multiple formats

### Pairing System
- Swiss-system pairings with USCF compliance
- Automatic bye assignment
- Pairing history tracking
- Conflict resolution

### Player Management
- Add players manually or import via CSV
- USCF rating lookup integration
- Player search and filtering
- Rating history tracking

### Analytics & Reporting
- Real-time tournament standings
- Comprehensive tiebreaker calculations
- PDF report generation
- Tournament statistics

## 🔧 Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **SQLite** - Lightweight database
- **JWT** - Authentication tokens

### Additional Tools
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection
- **Multer** - File upload handling

## 📚 Documentation

- [Heroku Deployment Guide](HEROKU_DEPLOYMENT.md)
- [Quick Deploy Instructions](QUICK_DEPLOY.md)
- [Authentication Setup](AUTHENTICATION_README.md)
- [CSV Import Guide](CSV_IMPORT_README.md)
- [Player Search Documentation](PLAYER_SEARCH_README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- USCF (United States Chess Federation) for pairing rules
- Chess.com for inspiration
- The open-source community for excellent tools and libraries

## 📞 Support

For support and questions:
- Create an issue in this repository
- Check the documentation files in the root directory
- Review the code comments for implementation details

---

**Built with ❤️ for the chess community**