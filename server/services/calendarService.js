const fs = require('fs');
const path = require('path');

class CalendarService {
  /**
   * Generate ICS (iCalendar) format for tournament
   * Supports Google Calendar, Outlook, Apple Calendar imports
   */
  generateTournamentICS(tournament, rounds, organization) {
    let icsContent = 'BEGIN:VCALENDAR\n';
    icsContent += 'VERSION:2.0\n';
    icsContent += 'PRODID:-//Chess Tournament Director//EN\n';
    icsContent += 'CALSCALE:GREGORIAN\n';
    icsContent += `X-WR-CALNAME:${this.escapeText(tournament.name)}\n`;
    icsContent += `X-WR-CALDESC:${this.escapeText(tournament.name)} - ${organization?.name || 'Chess Tournament'}\n`;
    icsContent += 'X-WR-TIMEZONE:America/New_York\n';
    icsContent += 'METHOD:PUBLISH\n';

    // Add timezone definition
    icsContent += this.getTimezoneDefinition();

    // Add events for each round
    if (rounds && rounds.length > 0) {
      rounds.forEach((round, index) => {
        icsContent += this.generateRoundEvent(tournament, round, index + 1, organization);
      });
    } else {
      // Generate generic round events based on rounds count
      const startDate = new Date(tournament.start_date);
      for (let i = 1; i <= tournament.rounds; i++) {
        const roundDate = new Date(startDate);
        roundDate.setDate(roundDate.getDate() + (i - 1));
        
        icsContent += this.generateGenericRoundEvent(tournament, i, roundDate, organization);
      }
    }

    // Add tournament end event
    const endDate = new Date(tournament.end_date || tournament.start_date);
    endDate.setHours(23, 59, 59);
    icsContent += this.generateTournamentEndEvent(tournament, endDate, organization);

    icsContent += 'END:VCALENDAR\n';

    return icsContent;
  }

  generateRoundEvent(tournament, round, roundNumber, organization) {
    const startTime = round.start_time || '09:00:00';
    const [hours, minutes] = startTime.split(':');
    
    const eventDate = new Date(round.date || tournament.start_date);
    eventDate.setHours(parseInt(hours), parseInt(minutes), 0);

    const uid = `${tournament.id}-round-${roundNumber}@chesslord.dev`;
    const dtstamp = this.formatDateTime(new Date());
    const dtstart = this.formatDateTime(eventDate);
    const dtend = this.formatDateTime(new Date(eventDate.getTime() + 3 * 60 * 60 * 1000)); // 3 hours

    let event = 'BEGIN:VEVENT\n';
    event += `UID:${uid}\n`;
    event += `DTSTAMP:${dtstamp}\n`;
    event += `DTSTART;TZID=America/New_York:${dtstart.replace('Z', '')}\n`;
    event += `DTEND;TZID=America/New_York:${dtend.replace('Z', '')}\n`;
    event += `SUMMARY:${this.escapeText(`Round ${roundNumber}: ${tournament.name}`)}\n`;
    event += `DESCRIPTION:Round ${roundNumber} of ${tournament.name}\\n`;
    event += `Format: ${tournament.format}\\n`;
    event += `Time Control: ${tournament.time_control || 'Not specified'}\\n`;
    
    if (tournament.location) {
      event += `LOCATION:${this.escapeText(tournament.location)}\\n`;
    }
    
    if (organization?.name) {
      event += `ORGANIZER;CN=${this.escapeText(organization.name)}:mailto:${organization.email || 'noreply@chesslord.dev'}\n`;
    }
    
    event += 'SEQUENCE:0\n';
    event += 'STATUS:CONFIRMED\n';
    event += 'TRANSP:OPAQUE\n';
    event += 'CATEGORIES:Chess,Tournament\n';
    event += 'END:VEVENT\n';

    return event;
  }

  generateGenericRoundEvent(tournament, roundNumber, eventDate, organization) {
    const uid = `${tournament.id}-round-${roundNumber}@chesslord.dev`;
    const dtstamp = this.formatDateTime(new Date());
    eventDate.setHours(9, 0, 0); // Default 9 AM
    const dtstart = this.formatDateTime(eventDate);
    const dtend = this.formatDateTime(new Date(eventDate.getTime() + 3 * 60 * 60 * 1000));

    let event = 'BEGIN:VEVENT\n';
    event += `UID:${uid}\n`;
    event += `DTSTAMP:${dtstamp}\n`;
    event += `DTSTART;TZID=America/New_York:${dtstart.replace('Z', '')}\n`;
    event += `DTEND;TZID=America/New_York:${dtend.replace('Z', '')}\n`;
    event += `SUMMARY:${this.escapeText(`Round ${roundNumber}: ${tournament.name}`)}\n`;
    event += `DESCRIPTION:Round ${roundNumber} of ${tournament.name}\\nFormat: ${tournament.format}\\nTime Control: ${tournament.time_control || 'Not specified'}\n`;
    
    if (tournament.location) {
      event += `LOCATION:${this.escapeText(tournament.location)}\n`;
    }
    
    if (organization?.name) {
      event += `ORGANIZER;CN=${this.escapeText(organization.name)}:mailto:${organization.email || 'noreply@chesslord.dev'}\n`;
    }
    
    event += 'SEQUENCE:0\n';
    event += 'STATUS:CONFIRMED\n';
    event += 'TRANSP:OPAQUE\n';
    event += 'CATEGORIES:Chess,Tournament\n';
    event += 'END:VEVENT\n';

    return event;
  }

  generateTournamentEndEvent(tournament, endDate, organization) {
    const uid = `${tournament.id}-end@chesslord.dev`;
    const dtstamp = this.formatDateTime(new Date());
    const dtstart = this.formatDateTime(endDate);

    let event = 'BEGIN:VEVENT\n';
    event += `UID:${uid}\n`;
    event += `DTSTAMP:${dtstamp}\n`;
    event += `DTSTART:${dtstart}\n`;
    event += `SUMMARY:${this.escapeText(tournament.name)} - Tournament Ends\n`;
    event += `DESCRIPTION:${this.escapeText(tournament.name)} tournament concludes\n`;
    
    if (tournament.location) {
      event += `LOCATION:${this.escapeText(tournament.location)}\n`;
    }
    
    event += 'SEQUENCE:0\n';
    event += 'STATUS:CONFIRMED\n';
    event += 'TRANSP:TRANSPARENT\n';
    event += 'CATEGORIES:Chess,Tournament\n';
    event += 'END:VEVENT\n';

    return event;
  }

  getTimezoneDefinition() {
    return `BEGIN:VTIMEZONE
TZID:America/New_York
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
DTSTART:20050403T020000
RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU
TZNAME:EDT
END:STANDARD
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
DTSTART:20051030T020000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
TZNAME:EST
END:STANDARD
END:VTIMEZONE
`;
  }

  formatDateTime(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  escapeText(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /**
   * Generate Google Calendar link
   * Opens calendar in browser with event details
   */
  generateGoogleCalendarLink(tournament, organization) {
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date || tournament.start_date);

    const params = new URLSearchParams({
      text: tournament.name,
      dates: `${this.formatGoogleDate(startDate)}/${this.formatGoogleDate(endDate)}`,
      details: `Chess Tournament\n${organization?.name || ''}`,
      location: tournament.location || ''
    });

    return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
  }

  formatGoogleDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Generate Outlook/iCal link
   */
  generateOutlookLink(tournament, organization) {
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date || tournament.start_date);
    endDate.setDate(endDate.getDate() + 1);

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      startdt: startDate.toISOString(),
      enddt: endDate.toISOString(),
      subject: tournament.name,
      body: `Organization: ${organization?.name || 'Chess Tournament'}\nLocation: ${tournament.location || ''}`,
      location: tournament.location || ''
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }
}

module.exports = CalendarService;
