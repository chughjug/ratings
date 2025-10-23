import jsPDF from 'jspdf';

export interface PairingData {
  id: string;
  board: number;
  white_name?: string;
  white_rating?: number;
  white_uscf_id?: string;
  black_name?: string;
  black_rating?: number;
  black_uscf_id?: string;
  result?: string;
  section?: string;
  is_bye?: boolean;
  is_intentional_bye?: boolean;
  white_id?: string;
  black_id?: string;
  round?: number;
}

export interface StandingData {
  id: string;
  name: string;
  rating?: number;
  uscf_id?: string;
  total_points: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  buchholz?: number;
  sonneborn_berger?: number;
  section?: string;
  rank: number;
}

export interface TournamentData {
  id: string;
  name: string;
  format: string;
  rounds: number;
  time_control?: string;
  start_date?: string;
  end_date?: string;
  city?: string;
  state?: string;
  location?: string;
  chief_td_name?: string;
  chief_arbiter_name?: string;
  status: string;
}

export class PDFExportService {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageHeight: number = 280;
  private margin: number = 20;
  private separatePages: boolean = false;

  constructor(separatePages: boolean = false) {
    this.doc = new jsPDF();
    this.separatePages = separatePages;
  }

  private addHeader(tournament: TournamentData, title: string, sectionName?: string) {
    // Tournament name
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(tournament.name, this.margin, this.currentY);
    this.currentY += 12;

    // Title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 10;

    // Section name if provided
    if (sectionName) {
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${sectionName} Section`, this.margin, this.currentY);
      this.currentY += 8;
    }

    // Tournament details
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    
    const details = [];
    if (tournament.start_date) {
      details.push(`Start: ${new Date(tournament.start_date).toLocaleDateString()}`);
    }
    if (tournament.end_date) {
      details.push(`End: ${new Date(tournament.end_date).toLocaleDateString()}`);
    }
    if (tournament.time_control) {
      details.push(`Time Control: ${tournament.time_control}`);
    }
    if (tournament.city && tournament.state) {
      details.push(`Location: ${tournament.city}, ${tournament.state}`);
    }
    if (tournament.location) {
      details.push(`Venue: ${tournament.location}`);
    }

    // Draw a line under the header
    this.doc.line(this.margin, this.currentY - 5, this.margin + 170, this.currentY - 5);
    this.currentY += 5;

    this.doc.text(details.join(' • '), this.margin, this.currentY);
    this.currentY += 15;
  }

  private checkPageBreak(neededSpace: number = 20) {
    if (this.currentY + neededSpace > this.pageHeight) {
      this.doc.addPage();
      this.currentY = 20;
      return true; // Indicates a page break occurred
    }
    return false;
  }

  private addSectionHeader(sectionName: string) {
    this.checkPageBreak(15);
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`${sectionName} Section`, this.margin, this.currentY);
    this.currentY += 8;
  }

  private wrapText(text: string, maxWidth: number, x: number): number {
    const words = text.split(' ');
    let line = '';
    let lines = 0;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const textWidth = this.doc.getTextWidth(testLine);
      
      if (textWidth > maxWidth && line !== '') {
        this.doc.text(line, x, this.currentY);
        this.currentY += 4;
        line = words[i] + ' ';
        lines++;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      this.doc.text(line, x, this.currentY);
      lines++;
    }
    
    return lines;
  }

  public exportPairings(tournament: TournamentData, pairings: PairingData[], round: number, selectedSection?: string) {
    this.doc = new jsPDF();
    this.currentY = 20;

    // Filter pairings by round - only show current round data
    const currentRoundPairings = pairings.filter(pairing => pairing.round === round);

    // Group pairings by section
    const pairingsBySection: { [key: string]: PairingData[] } = {};
    currentRoundPairings.forEach(pairing => {
      const section = pairing.section || 'Open';
      if (!pairingsBySection[section]) {
        pairingsBySection[section] = [];
      }
      pairingsBySection[section].push(pairing);
    });

    // Sort sections
    const sortedSections = Object.keys(pairingsBySection).sort();

    if (selectedSection && selectedSection !== 'all' && pairingsBySection[selectedSection]) {
      // Export single section
      this.exportSingleSection(tournament, `Round ${round} Pairings`, selectedSection, pairingsBySection[selectedSection]);
    } else {
      // Export all sections
      sortedSections.forEach((sectionName, index) => {
        if (this.separatePages && index > 0) {
          this.doc.addPage();
          this.currentY = 20;
        }
        
        this.exportSingleSection(tournament, `Round ${round} Pairings`, sectionName, pairingsBySection[sectionName]);
      });
    }

    return this.doc;
  }

  private exportSingleSection(tournament: TournamentData, title: string, sectionName: string, sectionPairings: PairingData[]) {
    this.addHeader(tournament, title, sectionName);
    
    sectionPairings.sort((a, b) => (a.board || 0) - (b.board || 0));

    // Table headers
    this.checkPageBreak(15);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    
    // Draw table header background
    this.doc.setFillColor(52, 58, 64);
    this.doc.rect(this.margin, this.currentY - 2, 170, 8, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.text('Board', this.margin + 2, this.currentY + 3);
    this.doc.text('White', this.margin + 25, this.currentY + 3);
    this.doc.text('Black', this.margin + 110, this.currentY + 3);
    this.doc.text('Result', this.margin + 160, this.currentY + 3);
    
    this.doc.setTextColor(0, 0, 0);
    this.currentY += 10;

    // Pairing rows
    this.doc.setFont('helvetica', 'normal');
    sectionPairings.forEach((pairing, index) => {
      // Check for page break before each pairing
      const pageBreakOccurred = this.checkPageBreak(15);
      
      // If page break occurred, re-add section header
      if (pageBreakOccurred) {
        this.addHeader(tournament, title, sectionName);
        
        // Re-add table headers
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFillColor(52, 58, 64);
        this.doc.rect(this.margin, this.currentY - 2, 170, 8, 'F');
        this.doc.setTextColor(255, 255, 255);
        this.doc.text('Board', this.margin + 2, this.currentY + 3);
        this.doc.text('White', this.margin + 25, this.currentY + 3);
        this.doc.text('Black', this.margin + 110, this.currentY + 3);
        this.doc.text('Result', this.margin + 160, this.currentY + 3);
        this.doc.setTextColor(0, 0, 0);
        this.currentY += 10;
        this.doc.setFont('helvetica', 'normal');
      }
      
      const startY = this.currentY;
      
      // Board number
      this.doc.setFontSize(10);
      this.doc.text(pairing.board?.toString() || '-', this.margin + 2, this.currentY);
      
      // White player with better formatting
      let whiteText = pairing.white_name || 'TBD';
      if (pairing.white_rating) {
        whiteText += ` (${pairing.white_rating})`;
      }
      if (pairing.white_uscf_id) {
        whiteText += ` [${pairing.white_uscf_id}]`;
      }
      if (pairing.is_bye) {
        whiteText += ' [Bye]';
      }
      
      // Black player with better formatting
      let blackText = pairing.black_name || 'TBD';
      if (pairing.black_rating) {
        blackText += ` (${pairing.black_rating})`;
      }
      if (pairing.black_uscf_id) {
        blackText += ` [${pairing.black_uscf_id}]`;
      }
      if (pairing.is_bye) {
        blackText += ' [Bye]';
      }
      
      // Use text wrapping for long names
      const whiteLines = this.wrapText(whiteText, 80, this.margin + 25);
      this.currentY = startY; // Reset for black player
      const blackLines = this.wrapText(blackText, 80, this.margin + 110);
      
      // Result
      this.doc.text(pairing.result || '-', this.margin + 160, startY);
      
      // Move to next line based on the longer text
      this.currentY = startY + Math.max(whiteLines, blackLines) * 4 + 4;
    });

    this.currentY += 10;
  }

  public exportStandings(tournament: TournamentData, standings: StandingData[]) {
    this.doc = new jsPDF();
    this.currentY = 20;

    this.addHeader(tournament, 'Tournament Standings');

    // Group standings by section
    const standingsBySection: { [key: string]: StandingData[] } = {};
    standings.forEach(standing => {
      const section = standing.section || 'Open';
      if (!standingsBySection[section]) {
        standingsBySection[section] = [];
      }
      standingsBySection[section].push(standing);
    });

    // Sort sections
    const sortedSections = Object.keys(standingsBySection).sort();

    sortedSections.forEach(sectionName => {
      this.addSectionHeader(sectionName);
      
      const sectionStandings = standingsBySection[sectionName];
      sectionStandings.sort((a, b) => b.total_points - a.total_points);

      // Table headers
      this.checkPageBreak(15);
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      
      this.doc.text('Rank', this.margin, this.currentY);
      this.doc.text('Name', this.margin + 15, this.currentY);
      this.doc.text('Rating', this.margin + 80, this.currentY);
      this.doc.text('Points', this.margin + 110, this.currentY);
      this.doc.text('Games', this.margin + 130, this.currentY);
      this.doc.text('W-L-D', this.margin + 150, this.currentY);
      this.doc.text('Buchholz', this.margin + 180, this.currentY);
      
      this.currentY += 8;

      // Draw line under headers
      this.doc.line(this.margin, this.currentY, this.margin + 200, this.currentY);
      this.currentY += 5;

      // Standing rows
      this.doc.setFont('helvetica', 'normal');
      sectionStandings.forEach((standing, index) => {
        // Check for page break before each standing
        const pageBreakOccurred = this.checkPageBreak(12);
        
        // If page break occurred, re-add section header
        if (pageBreakOccurred) {
          this.doc.setFontSize(12);
          this.doc.setFont('helvetica', 'bold');
          this.doc.text(`${sectionName} Section (continued)`, this.margin, this.currentY);
          this.currentY += 8;
          
          // Re-add table headers
          this.doc.setFontSize(10);
          this.doc.setFont('helvetica', 'bold');
          this.doc.text('Rank', this.margin, this.currentY);
          this.doc.text('Name', this.margin + 15, this.currentY);
          this.doc.text('Rating', this.margin + 80, this.currentY);
          this.doc.text('Points', this.margin + 110, this.currentY);
          this.doc.text('Games', this.margin + 130, this.currentY);
          this.doc.text('W-L-D', this.margin + 150, this.currentY);
          this.doc.text('Buchholz', this.margin + 180, this.currentY);
          this.currentY += 8;
          this.doc.line(this.margin, this.currentY, this.margin + 200, this.currentY);
          this.currentY += 5;
          this.doc.setFont('helvetica', 'normal');
        }
        
        // Rank
        this.doc.text((index + 1).toString(), this.margin, this.currentY);
        
        // Name with text wrapping
        let nameText = standing.name;
        if (standing.uscf_id) {
          nameText += ` [${standing.uscf_id}]`;
        }
        this.wrapText(nameText, 60, this.margin + 15);
        
        // Rating
        this.doc.text(standing.rating?.toString() || 'Unrated', this.margin + 80, this.currentY);
        
        // Points
        this.doc.text(standing.total_points.toString(), this.margin + 110, this.currentY);
        
        // Games
        this.doc.text(standing.games_played.toString(), this.margin + 130, this.currentY);
        
        // W-L-D
        this.doc.text(`${standing.wins}-${standing.losses}-${standing.draws}`, this.margin + 150, this.currentY);
        
        // Buchholz
        this.doc.text(standing.buchholz?.toFixed(1) || '-', this.margin + 180, this.currentY);
        
        this.currentY += 8;
      });

      this.currentY += 10;
    });

    return this.doc;
  }

  public exportTournamentReport(tournament: TournamentData, standings: StandingData[], pairings: PairingData[]) {
    this.doc = new jsPDF();
    this.currentY = 20;

    this.addHeader(tournament, 'Tournament Report');

    // Tournament summary
    this.checkPageBreak(20);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Tournament Summary', this.margin, this.currentY);
    this.currentY += 8;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    const summary = [
      `Format: ${tournament.format}`,
      `Rounds: ${tournament.rounds}`,
      `Players: ${standings.length}`,
      `Status: ${tournament.status}`
    ];

    summary.forEach(line => {
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += 6;
    });

    this.currentY += 10;

    // Add standings (filtered to current data)
    this.exportStandings(tournament, standings);

    return this.doc;
  }

  public downloadPDF(filename: string) {
    this.doc.save(filename);
  }

  public getPDFBlob(): Blob {
    return this.doc.output('blob');
  }

  public getPDFDataURL(): string {
    return this.doc.output('dataurlstring');
  }
}

// Utility function to export pairings as PDF
export const exportPairingsPDF = async (
  tournament: TournamentData,
  pairings: PairingData[],
  round: number,
  filename?: string,
  selectedSection?: string,
  separatePages?: boolean
) => {
  const service = new PDFExportService(separatePages || false);
  service.exportPairings(tournament, pairings, round, selectedSection);
  service.downloadPDF(filename || `${tournament.name}_Round_${round}_Pairings.pdf`);
};

// Utility function to export standings as PDF
export const exportStandingsPDF = async (
  tournament: TournamentData,
  standings: StandingData[],
  filename?: string,
  selectedSection?: string,
  separatePages?: boolean
) => {
  const service = new PDFExportService(separatePages || false);
  service.exportStandings(tournament, standings);
  service.downloadPDF(filename || `${tournament.name}_Standings.pdf`);
};

// Utility function to export tournament report as PDF
export const exportTournamentReportPDF = async (
  tournament: TournamentData,
  standings: StandingData[],
  pairings: PairingData[],
  filename?: string,
  separatePages?: boolean
) => {
  const service = new PDFExportService(separatePages || false);
  service.exportTournamentReport(tournament, standings, pairings);
  service.downloadPDF(filename || `${tournament.name}_Tournament_Report.pdf`);
};
