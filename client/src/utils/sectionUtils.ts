import { Tournament, Player } from '../types';

/**
 * Get available sections from tournament data and pairings
 * @param tournament - The tournament object
 * @param players - Array of players (required)
 * @param pairings - Array of pairings (optional, used for quad tournaments)
 * @returns Array of unique section names
 */
export const getAvailableSections = (tournament: Tournament, players: Player[], pairings?: any[]): string[] => {
  const sections = new Set<string>();
  
  try {
    // Get sections from tournament settings
    if (tournament?.settings?.sections && Array.isArray(tournament.settings.sections)) {
      tournament.settings.sections.forEach(section => {
        if (section && section.name && typeof section.name === 'string' && section.name.trim() !== '') {
          sections.add(section.name.trim());
        }
      });
    }
    
    // Get sections from players
    if (players && Array.isArray(players)) {
      players.forEach((player: Player) => {
        if (player && player.section && typeof player.section === 'string' && player.section.trim() !== '') {
          sections.add(player.section.trim());
        }
      });
    }
    
    // Get sections from pairings (needed for quad tournaments)
    if (pairings && Array.isArray(pairings)) {
      pairings.forEach((pairing: any) => {
        if (pairing && pairing.section && typeof pairing.section === 'string' && pairing.section.trim() !== '') {
          sections.add(pairing.section.trim());
        }
      });
    }
  } catch (error) {
    console.error('Error in getAvailableSections:', error);
  }
  
  return Array.from(sections).sort();
};

/**
 * Get available sections for a specific tournament context
 * @param tournament - The tournament object
 * @param players - Array of players (required)
 * @param includeAll - Whether to include an "All Sections" option (default: false)
 * @param pairings - Array of pairings (optional, used for quad tournaments)
 * @returns Array of section names for dropdown options
 */
export const getSectionOptions = (tournament: Tournament, players: Player[], includeAll: boolean = false, pairings?: any[]): string[] => {
  try {
    if (!tournament || !players) {
      return [];
    }
    
    const sections = getAvailableSections(tournament, players, pairings);
    
    if (includeAll) {
      return ['All Sections', ...sections];
    }
    
    return sections;
  } catch (error) {
    console.error('Error in getSectionOptions:', error);
    return [];
  }
};
