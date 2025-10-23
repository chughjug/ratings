/**
 * QR Code Service
 * Generates QR codes for various tournament elements
 */

interface QRCodeData {
  type: 'pairing' | 'standings' | 'tournament' | 'player';
  tournamentId: string;
  round?: number;
  board?: number;
  playerId?: string;
  data: any;
}

interface QRCodeOptions {
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export class QRCodeService {
  private static instance: QRCodeService;
  private qrCodeLibrary: any = null;

  private constructor() {
    this.initializeLibrary();
  }

  public static getInstance(): QRCodeService {
    if (!QRCodeService.instance) {
      QRCodeService.instance = new QRCodeService();
    }
    return QRCodeService.instance;
  }

  private async initializeLibrary() {
    try {
      // Dynamically import QR code library
      const QRCode = await import('qrcode');
      this.qrCodeLibrary = QRCode;
    } catch (error) {
      console.warn('QR Code library not available:', error);
    }
  }

  /**
   * Generate QR code for pairing
   */
  async generatePairingQRCode(
    tournamentId: string,
    round: number,
    board: number,
    whitePlayer: string,
    blackPlayer: string,
    timeControl?: string,
    startTime?: string,
    options: QRCodeOptions = {}
  ): Promise<string> {
    const data: QRCodeData = {
      type: 'pairing',
      tournamentId,
      round,
      board,
      data: {
        whitePlayer,
        blackPlayer,
        timeControl,
        startTime,
        timestamp: new Date().toISOString()
      }
    };

    return this.generateQRCode(data, options);
  }

  /**
   * Generate QR code for standings
   */
  async generateStandingsQRCode(
    tournamentId: string,
    round?: number,
    section?: string,
    options: QRCodeOptions = {}
  ): Promise<string> {
    const data: QRCodeData = {
      type: 'standings',
      tournamentId,
      round,
      data: {
        section,
        timestamp: new Date().toISOString()
      }
    };

    return this.generateQRCode(data, options);
  }

  /**
   * Generate QR code for tournament info
   */
  async generateTournamentQRCode(
    tournamentId: string,
    tournamentName: string,
    location?: string,
    startDate?: string,
    options: QRCodeOptions = {}
  ): Promise<string> {
    const data: QRCodeData = {
      type: 'tournament',
      tournamentId,
      data: {
        name: tournamentName,
        location,
        startDate,
        timestamp: new Date().toISOString()
      }
    };

    return this.generateQRCode(data, options);
  }

  /**
   * Generate QR code for player info
   */
  async generatePlayerQRCode(
    tournamentId: string,
    playerId: string,
    playerName: string,
    rating?: number,
    section?: string,
    options: QRCodeOptions = {}
  ): Promise<string> {
    const data: QRCodeData = {
      type: 'player',
      tournamentId,
      playerId,
      data: {
        name: playerName,
        rating,
        section,
        timestamp: new Date().toISOString()
      }
    };

    return this.generateQRCode(data, options);
  }

  /**
   * Generate QR code as data URL
   */
  async generateQRCodeAsDataURL(
    data: QRCodeData,
    options: QRCodeOptions = {}
  ): Promise<string> {
    if (!this.qrCodeLibrary) {
      throw new Error('QR Code library not available');
    }

    const qrOptions = {
      width: options.size || 200,
      margin: options.margin || 2,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF'
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M'
    };

    const qrData = this.serializeQRData(data);
    return this.qrCodeLibrary.toDataURL(qrData, qrOptions);
  }

  /**
   * Generate QR code as SVG
   */
  async generateQRCodeAsSVG(
    data: QRCodeData,
    options: QRCodeOptions = {}
  ): Promise<string> {
    if (!this.qrCodeLibrary) {
      throw new Error('QR Code library not available');
    }

    const qrOptions = {
      width: options.size || 200,
      margin: options.margin || 2,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF'
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M'
    };

    const qrData = this.serializeQRData(data);
    return this.qrCodeLibrary.toString(qrData, { type: 'svg', ...qrOptions });
  }

  /**
   * Generate QR code and return as base64
   */
  private async generateQRCode(
    data: QRCodeData,
    options: QRCodeOptions = {}
  ): Promise<string> {
    return this.generateQRCodeAsDataURL(data, options);
  }

  /**
   * Serialize QR data to string
   */
  private serializeQRData(data: QRCodeData): string {
    const baseUrl = window.location.origin;
    const qrUrl = `${baseUrl}/qr/${data.type}/${data.tournamentId}`;
    
    const params = new URLSearchParams();
    if (data.round) params.append('round', data.round.toString());
    if (data.board) params.append('board', data.board.toString());
    if (data.playerId) params.append('player', data.playerId);
    
    // Add data as JSON parameter
    params.append('data', JSON.stringify(data.data));
    
    return `${qrUrl}?${params.toString()}`;
  }

  /**
   * Parse QR code data from URL
   */
  static parseQRCodeData(url: string): QRCodeData | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      if (pathParts.length < 4 || pathParts[1] !== 'qr') {
        return null;
      }

      const type = pathParts[2] as QRCodeData['type'];
      const tournamentId = pathParts[3];
      
      const round = urlObj.searchParams.get('round') ? 
        parseInt(urlObj.searchParams.get('round')!) : undefined;
      const board = urlObj.searchParams.get('board') ? 
        parseInt(urlObj.searchParams.get('board')!) : undefined;
      const playerId = urlObj.searchParams.get('player') || undefined;
      
      const dataParam = urlObj.searchParams.get('data');
      const data = dataParam ? JSON.parse(dataParam) : {};

      return {
        type,
        tournamentId,
        round,
        board,
        playerId,
        data
      };
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      return null;
    }
  }

  /**
   * Generate QR code for printing
   */
  async generatePrintableQRCode(
    data: QRCodeData,
    options: QRCodeOptions = {}
  ): Promise<{
    dataUrl: string;
    svg: string;
    printData: {
      title: string;
      subtitle?: string;
      qrCode: string;
      url: string;
    }
  }> {
    const dataUrl = await this.generateQRCodeAsDataURL(data, options);
    const svg = await this.generateQRCodeAsSVG(data, options);
    const url = this.serializeQRData(data);

    let title = '';
    let subtitle = '';

    switch (data.type) {
      case 'pairing':
        title = `Round ${data.round} - Board ${data.board}`;
        subtitle = `${data.data.whitePlayer} vs ${data.data.blackPlayer}`;
        break;
      case 'standings':
        title = 'Tournament Standings';
        subtitle = data.round ? `After Round ${data.round}` : 'Current';
        break;
      case 'tournament':
        title = data.data.name;
        subtitle = data.data.location;
        break;
      case 'player':
        title = data.data.name;
        subtitle = data.data.rating ? `Rating: ${data.data.rating}` : '';
        break;
    }

    return {
      dataUrl,
      svg,
      printData: {
        title,
        subtitle,
        qrCode: dataUrl,
        url
      }
    };
  }

  /**
   * Generate multiple QR codes for batch printing
   */
  async generateBatchQRCodes(
    items: Array<{
      data: QRCodeData;
      options?: QRCodeOptions;
      label?: string;
    }>
  ): Promise<Array<{
    data: QRCodeData;
    dataUrl: string;
    svg: string;
    label?: string;
  }>> {
    const results = [];
    
    for (const item of items) {
      try {
        const dataUrl = await this.generateQRCodeAsDataURL(item.data, item.options);
        const svg = await this.generateQRCodeAsSVG(item.data, item.options);
        
        results.push({
          data: item.data,
          dataUrl,
          svg,
          label: item.label
        });
      } catch (error) {
        console.error('Error generating QR code for item:', item, error);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const qrCodeService = QRCodeService.getInstance();

// Export utility functions
export const generatePairingQR = qrCodeService.generatePairingQRCode.bind(qrCodeService);
export const generateStandingsQR = qrCodeService.generateStandingsQRCode.bind(qrCodeService);
export const generateTournamentQR = qrCodeService.generateTournamentQRCode.bind(qrCodeService);
export const generatePlayerQR = qrCodeService.generatePlayerQRCode.bind(qrCodeService);
