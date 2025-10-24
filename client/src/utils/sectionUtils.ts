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
  
  // Get sections from tournament settings
  if (tournament.settings?.sections) {
    tournament.settings.sections.forEach(section => {
      if (section.name && section.name.trim() !== '') {
        sections.add(section.name);
      }
    });
  }
  
  // Get sections from players
  players.forEach((player: Player) => {
    if (player.section && player.section.trim() !== '') {
      sections.add(player.section);
    }
  });
  
  // Get sections from pairings (needed for quad tournaments)
  if (pairings && Array.isArray(pairings)) {
    pairings.forEach((pairing: any) => {
      if (pairing.section && pairing.section.trim() !== '') {
        sections.add(pairing.section);
      }
    });
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
  const sections = getAvailableSections(tournament, players, pairings);
  
  if (includeAll) {
    return ['All Sections', ...sections];
  }
  
  return sections;
};
