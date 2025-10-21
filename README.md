# Chess Tournament Director

A comprehensive chess tournament management system inspired by SwissSys and ChessManager, built with React and Node.js.

## Features

- **Tournament Management**: Create and manage Swiss system, round-robin, and knockout tournaments
- **Player Management**: Add players with USCF/FIDE ratings and membership verification
- **Automated Pairings**: USCF-compliant Swiss system pairing algorithm
- **Real-time Results**: Input game results and automatically update standings
- **Comprehensive Reporting**: Generate standings, crosstables, and tournament reports
- **Modern UI**: Responsive design with intuitive user interface

## Technology Stack

- **Frontend**: React 18 with TypeScript, Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Icons**: Lucide React

## Installation

1. Install dependencies:
```bash
npm run install-all
```

2. Set up environment variables:
Create `.env` files in both root and client directories:
- Root `.env`: `PORT=5000`
- Client `.env`: `REACT_APP_API_URL=http://localhost:5000/api`

3. Start the development server:
```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend development server (port 3000).

## Usage

1. **Create Tournament**: Set up a new tournament with basic information and settings
2. **Add Players**: Register players with their ratings and membership information
3. **Generate Pairings**: Use the automated Swiss system pairing algorithm
4. **Input Results**: Record game results and update standings
5. **View Reports**: Access comprehensive tournament reports and standings

## Tournament Director Certification

This system is designed to support US Chess Federation tournament director certification requirements, including:

- Local TD (26b, b4)
- Senior TD (30b, b9) 
- Associate National TD (34b, b3)
- National TD (38b, b3)

## API Endpoints

### Tournaments
- `GET /api/tournaments` - Get all tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments/:id` - Get tournament by ID
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

### Players
- `GET /api/players/tournament/:tournamentId` - Get players for tournament
- `POST /api/players` - Add player
- `POST /api/players/bulk` - Bulk add players
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Remove player

### Pairings
- `GET /api/pairings/tournament/:tournamentId/round/:round` - Get round pairings
- `POST /api/pairings/generate` - Generate pairings
- `PUT /api/pairings/:id/result` - Update pairing result
- `GET /api/pairings/tournament/:tournamentId/standings` - Get standings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
