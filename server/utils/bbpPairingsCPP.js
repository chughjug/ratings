const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * C++ bbpPairings Interface
 * Interfaces with the actual C++ bbpPairings executable
 */
class BBPPairingsCPP {
  constructor() {
    this.executablePath = this.findExecutable();
  }

  /**
   * Find the bbpPairings executable
   */
  findExecutable() {
    const possiblePaths = [
      path.join(__dirname, 'bbpPairings-master', 'bbpPairings'),
      path.join(__dirname, 'bbpPairings-master', 'bbpPairings.exe'),
      path.join(process.cwd(), 'bbpPairings-master', 'bbpPairings'),
      '/usr/local/bin/bbpPairings',
      '/opt/bbpPairings/bbpPairings'
    ];

    for (const execPath of possiblePaths) {
      if (fs.existsSync(execPath)) {
        return execPath;
      }
    }

    throw new Error('bbpPairings executable not found. Please compile it first.');
  }

  /**
   * Generate pairings using C++ bbpPairings
   */
  async generatePairings(tournamentId, round, players, options = {}) {
    try {
      // Create TRF input file
      const trfInput = this.createTRFInput(tournamentId, round, players, options);
      const inputFile = path.join(__dirname, 'temp_input.trf');
      const outputFile = path.join(__dirname, 'temp_output.trf');

      fs.writeFileSync(inputFile, trfInput);

      // Run bbpPairings
      const result = await this.runBBPPairings(inputFile, outputFile, options);

      // Parse output
      const pairings = this.parseTRFOutput(outputFile, players);

      // Cleanup
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);

      return {
        success: true,
        pairings,
        metadata: {
          tournamentId,
          round,
          pairingSystem: options.pairingSystem || 'dutch',
          playersCount: players.length
        }
      };

    } catch (error) {
      console.error('C++ bbpPairings error:', error);
      return {
        success: false,
        error: error.message,
        pairings: []
      };
    }
  }

  /**
   * Run bbpPairings executable
   */
  async runBBPPairings(inputFile, outputFile, options) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dutch',  // or --burstein
        inputFile,
        '-p',
        outputFile
      ];

      if (options.pairingSystem === 'burstein') {
        args[0] = '--burstein';
      }

      console.log(`Running: ${this.executablePath} ${args.join(' ')}`);

      const process = spawn(this.executablePath, args);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`bbpPairings exited with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start bbpPairings: ${error.message}`));
      });
    });
  }

  /**
   * Create TRF input file format
   */
  createTRFInput(tournamentId, round, players, options) {
    let trf = '';
    
    // Tournament header
    trf += `012 ${options.tournamentName || 'Tournament'}\n`;
    trf += `022 ${options.tournamentCity || 'City'}\n`;
    trf += `032 ${options.tournamentDate || new Date().toISOString().split('T')[0]}\n`;
    trf += `042 ${options.tournamentDate || new Date().toISOString().split('T')[0]}\n`;
    trf += `052 ${options.tournamentRounds || 5}\n`;
    trf += `062 1\n`; // Number of sections
    trf += `072 ${options.tournamentType || 'S'}\n`; // Swiss system
    trf += `092 ${options.timeControl || '90+30'}\n`;
    trf += `102 ${options.tournamentChiefTD || 'TD'}\n`;
    trf += `112 ${options.tournamentChiefArbiter || 'Arbiter'}\n`;
    trf += `122 ${options.tournamentChiefOrganizer || 'Organizer'}\n`;
    trf += `132 ${options.tournamentWebsite || ''}\n`;
    trf += `142 ${options.tournamentEmail || ''}\n`;
    trf += `152 ${options.tournamentPhone || ''}\n`;
    trf += `162 ${options.tournamentAddress || ''}\n`;
    trf += `172 ${options.tournamentFederation || 'USA'}\n`;
    trf += `182 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `192 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `202 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `212 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `222 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `232 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `242 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `252 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `262 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `272 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `282 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `292 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `302 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `312 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `322 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `332 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `342 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `352 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `362 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `372 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `382 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `392 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `402 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `412 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `422 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `432 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `442 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `452 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `462 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `472 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `482 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `492 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `502 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `512 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `522 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `532 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `542 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `552 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `562 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `572 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `582 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `592 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `602 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `612 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `622 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `632 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `642 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `652 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `662 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `672 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `682 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `692 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `702 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `712 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `722 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `732 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `742 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `752 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `762 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `772 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `782 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `792 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `802 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `812 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `822 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `832 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `842 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `852 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `862 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `872 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `882 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `892 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `902 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `912 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `922 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `932 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `942 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `952 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `962 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `972 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `982 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `992 ${options.tournamentFederationCode || 'USA'}\n`;
    trf += `001 1 ${options.sectionName || 'Open'}\n`;

    // Players
    players.forEach((player, index) => {
      const playerNumber = index + 1;
      const name = player.name || `Player ${playerNumber}`;
      const rating = player.rating || 0;
      const federation = player.federation || 'USA';
      
      trf += `001 ${playerNumber} ${name} ${rating} ${federation}\n`;
    });

    return trf;
  }

  /**
   * Parse TRF output file
   */
  parseTRFOutput(outputFile, players) {
    const content = fs.readFileSync(outputFile, 'utf8');
    const lines = content.split('\n');
    const pairings = [];

    // Create mapping from numeric IDs to actual player IDs
    const playerIdMap = {};
    players.forEach((player, index) => {
      playerIdMap[index + 1] = player.id;
    });

    // Parse pairing lines (format: 001 round board white black result)
    for (const line of lines) {
      if (line.startsWith('001') && line.includes(' ')) {
        const parts = line.split(' ');
        if (parts.length >= 6) {
          const round = parseInt(parts[1]);
          const board = parseInt(parts[2]);
          const whiteNum = parseInt(parts[3]);
          const blackNum = parseInt(parts[4]);
          const result = parts[5];

          if (!isNaN(round) && !isNaN(board) && !isNaN(whiteNum)) {
            const whitePlayerId = playerIdMap[whiteNum];
            const blackPlayerId = blackNum ? playerIdMap[blackNum] : null;

            if (whitePlayerId) {
              pairings.push({
                round,
                board,
                white_player_id: whitePlayerId,
                black_player_id: blackPlayerId,
                result: result || null,
                is_bye: !blackPlayerId,
                section: 'Open'
              });
            }
          }
        }
      }
    }

    return pairings;
  }
}

module.exports = { BBPPairingsCPP };
