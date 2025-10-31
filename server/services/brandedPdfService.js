const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * Branded PDF Service
 * Generates branded PDF documents (score sheets and quad forms) with organization/club branding
 */

class BrandedPdfService {
  constructor() {
    this.doc = null;
  }

  /**
   * Load image from URL or file path and return as base64
   */
  async loadImage(imageUrl) {
    if (!imageUrl) return null;
    
    try {
      // If it's a URL, fetch it
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
      }
      
      // If it's a local file path, read it
      if (imageUrl.startsWith('/') || imageUrl.startsWith('./')) {
        const imageData = await fs.readFile(imageUrl);
        return imageData;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading image:', error);
      return null;
    }
  }

  /**
   * Add organization branding to the PDF header
   */
  async addBrandingHeader(doc, organization, tournament) {
    const pageWidth = doc.page.width;
    const margin = 50;
    
    // Add logo if available
    if (organization.logoUrl) {
      try {
        const logoImage = await this.loadImage(organization.logoUrl);
        if (logoImage) {
          doc.image(logoImage, margin, 50, { 
            width: 60, 
            height: 60,
            fit: [60, 60],
            align: 'left'
          });
        }
      } catch (error) {
        console.error('Error adding logo:', error);
      }
    }
    
    // Organization name
    if (organization.name) {
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a')
         .text(organization.name, organization.logoUrl ? margin + 70 : margin, 55, {
           width: pageWidth - margin * 2 - 70,
           align: organization.logoUrl ? 'left' : 'center'
         });
    }
    
    // Tournament name
    if (tournament.name) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#4a4a4a')
         .text(tournament.name, organization.logoUrl ? margin + 70 : margin, organization.logoUrl ? 75 : 85, {
           width: pageWidth - margin * 2 - 70,
           align: organization.logoUrl ? 'left' : 'center'
         });
    }
    
    // Draw a line separator
    doc.moveTo(margin, 120)
       .lineTo(pageWidth - margin, 120)
       .strokeColor('#cccccc')
       .lineWidth(1)
       .stroke();
    
    return 130; // Return Y position after header
  }

  /**
   * Generate branded score sheets for a round
   */
  async generateScoreSheets(tournament, pairings, organization, round, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 50,
          info: {
            Title: `${tournament.name} - Round ${round} Score Sheets`,
            Author: organization?.name || 'Chess Tournament Director',
            Subject: 'Tournament Score Sheets'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 50;
        let currentY = await this.addBrandingHeader(doc, organization || {}, tournament);

        // Group pairings by section
        const pairingsBySection = {};
        pairings.forEach(pairing => {
          const section = pairing.section || 'Open';
          if (!pairingsBySection[section]) {
            pairingsBySection[section] = [];
          }
          pairingsBySection[section].push(pairing);
        });

        // Sort sections
        const sections = Object.keys(pairingsBySection).sort();

        sections.forEach((sectionName, sectionIndex) => {
          if (sectionIndex > 0) {
            doc.addPage();
            currentY = await this.addBrandingHeader(doc, organization || {}, tournament);
          }

          // Section header
          if (sectionName !== 'Open' || sections.length > 1) {
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#333333')
               .text(`${sectionName} Section`, margin, currentY);
            currentY += 20;
          }

          // Round info
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor('#666666')
             .text(`Round ${round}`, margin, currentY);
          currentY += 25;

          // Generate score sheets for each pairing
          const sectionPairings = pairingsBySection[sectionName].sort((a, b) => (a.board || 0) - (b.board || 0));
          
          sectionPairings.forEach((pairing, index) => {
            // Check if we need a new page
            if (currentY > pageHeight - 150) {
              doc.addPage();
              currentY = await this.addBrandingHeader(doc, organization || {}, tournament);
            }

            // Score sheet box
            const sheetHeight = 120;
            const sheetWidth = pageWidth - margin * 2;
            
            // Draw border
            doc.rect(margin, currentY, sheetWidth, sheetHeight)
               .strokeColor('#333333')
               .lineWidth(1)
               .stroke();

            // Board number
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text(`Board ${pairing.board || index + 1}`, margin + 10, currentY + 10);

            // White player
            const whiteY = currentY + 35;
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text('White:', margin + 10, whiteY);
            
            let whiteText = pairing.white_name || 'TBD';
            if (pairing.white_rating) {
              whiteText += ` (${pairing.white_rating})`;
            }
            if (pairing.white_uscf_id) {
              whiteText += ` [${pairing.white_uscf_id}]`;
            }
            
            doc.font('Helvetica')
               .fontSize(11)
               .text(whiteText, margin + 60, whiteY, {
                 width: sheetWidth - 140
               });

            // Black player
            const blackY = currentY + 55;
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text('Black:', margin + 10, blackY);
            
            let blackText = pairing.black_name || 'TBD';
            if (pairing.black_rating) {
              blackText += ` (${pairing.black_rating})`;
            }
            if (pairing.black_uscf_id) {
              blackText += ` [${pairing.black_uscf_id}]`;
            }
            
            doc.font('Helvetica')
               .fontSize(11)
               .text(blackText, margin + 60, blackY, {
                 width: sheetWidth - 140
               });

            // Result section
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#666666')
               .text('Result:', margin + 10, currentY + 80);
            
            // Draw result boxes
            const resultBoxY = currentY + 95;
            const resultBoxWidth = 35;
            const resultBoxHeight = 15;
            const resultSpacing = 45;
            
            ['1-0', '0-1', '½-½', 'F-F'].forEach((result, i) => {
              const x = margin + 60 + (i * resultSpacing);
              doc.rect(x, resultBoxY, resultBoxWidth, resultBoxHeight)
                 .strokeColor('#999999')
                 .lineWidth(0.5)
                 .stroke();
              doc.fontSize(9)
                 .font('Helvetica')
                 .fillColor('#666666')
                 .text(result, x + resultBoxWidth / 2, resultBoxY + 3, {
                   align: 'center',
                   width: resultBoxWidth
                 });
            });

            // Time control info if available
            if (tournament.time_control) {
              doc.fontSize(8)
                 .font('Helvetica-Oblique')
                 .fillColor('#999999')
                 .text(`Time Control: ${tournament.time_control}`, margin + 10, currentY + 110);
            }

            currentY += sheetHeight + 10;
          });
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate branded quad forms for a quad tournament
   */
  async generateQuadForms(tournament, quads, organization, round, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 50,
          info: {
            Title: `${tournament.name} - Round ${round} Quad Forms`,
            Author: organization?.name || 'Chess Tournament Director',
            Subject: 'Quad Tournament Forms'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 50;
        let currentY = await this.addBrandingHeader(doc, organization || {}, tournament);

        // Round info
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#333333')
           .text(`Round ${round} Quad Pairings`, margin, currentY);
        currentY += 30;

        // Generate a form for each quad
        quads.forEach((quad, quadIndex) => {
          if (quadIndex > 0) {
            doc.addPage();
            currentY = await this.addBrandingHeader(doc, organization || {}, tournament);
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#333333')
               .text(`Round ${round} Quad Pairings`, margin, currentY);
            currentY += 30;
          }

          // Quad header
          doc.fontSize(16)
             .font('Helvetica-Bold')
             .fillColor('#000000')
             .text(quad.name || `Quad ${quad.number || quadIndex + 1}`, margin, currentY);
          currentY += 25;

          // Quad players box
          const quadBoxHeight = Math.max(120, quad.players.length * 30 + 40);
          
          doc.rect(margin, currentY, pageWidth - margin * 2, quadBoxHeight)
             .strokeColor('#333333')
             .lineWidth(1.5)
             .stroke();

          // Player list
          const playerStartY = currentY + 15;
          quad.players.forEach((player, playerIndex) => {
            const playerY = playerStartY + (playerIndex * 25);
            
            // Player number
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text(`${playerIndex + 1}.`, margin + 10, playerY);
            
            // Player name and info
            let playerText = player.name || player.first_name + ' ' + player.last_name || 'TBD';
            if (player.rating) {
              playerText += ` (${player.rating})`;
            }
            if (player.uscf_id) {
              playerText += ` [${player.uscf_id}]`;
            }
            
            doc.font('Helvetica')
               .fontSize(10)
               .text(playerText, margin + 35, playerY, {
                 width: pageWidth - margin * 2 - 50
               });
          });

          currentY += quadBoxHeight + 20;

          // Pairings for this quad
          if (quad.pairings && quad.pairings.length > 0) {
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor('#333333')
               .text('Round Pairings:', margin, currentY);
            currentY += 20;

            quad.pairings.forEach((pairing, pairingIndex) => {
              if (currentY > pageHeight - 100) {
                doc.addPage();
                currentY = await this.addBrandingHeader(doc, organization || {}, tournament);
              }

              // Pairing box
              const pairingBoxHeight = 60;
              
              doc.rect(margin, currentY, pageWidth - margin * 2, pairingBoxHeight)
                 .strokeColor('#cccccc')
                 .lineWidth(0.5)
                 .stroke();

              // White player
              doc.fontSize(10)
                 .font('Helvetica-Bold')
                 .fillColor('#000000')
                 .text('White:', margin + 10, currentY + 10);
              
              let whiteText = pairing.white_name || 'TBD';
              if (pairing.white_rating) {
                whiteText += ` (${pairing.white_rating})`;
              }
              
              doc.font('Helvetica')
                 .fontSize(9)
                 .text(whiteText, margin + 60, currentY + 10);

              // Black player
              doc.fontSize(10)
                 .font('Helvetica-Bold')
                 .fillColor('#000000')
                 .text('Black:', margin + 10, currentY + 30);
              
              let blackText = pairing.black_name || 'TBD';
              if (pairing.black_rating) {
                blackText += ` (${pairing.black_rating})`;
              }
              
              doc.font('Helvetica')
                 .fontSize(9)
                 .text(blackText, margin + 60, currentY + 30);

              // Result section
              doc.fontSize(9)
                 .font('Helvetica')
                 .fillColor('#666666')
                 .text('Result:', margin + 10, currentY + 45);

              const resultBoxY = currentY + 45;
              const resultBoxWidth = 30;
              const resultBoxHeight = 12;
              const resultSpacing = 40;
              
              ['1-0', '0-1', '½-½'].forEach((result, i) => {
                const x = margin + 60 + (i * resultSpacing);
                doc.rect(x, resultBoxY, resultBoxWidth, resultBoxHeight)
                   .strokeColor('#999999')
                   .lineWidth(0.5)
                   .stroke();
                doc.fontSize(8)
                   .font('Helvetica')
                   .fillColor('#666666')
                   .text(result, x + resultBoxWidth / 2, resultBoxY + 2, {
                     align: 'center',
                     width: resultBoxWidth
                   });
              });

              currentY += pairingBoxHeight + 10;
            });
          }

          currentY += 20;
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new BrandedPdfService();

