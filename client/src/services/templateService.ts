/**
 * Tournament Template Service
 * Manages tournament templates for quick tournament creation
 */

import { TournamentTemplate, TournamentSettings } from '../types';

export class TemplateService {
  private static instance: TemplateService;
  private templates: TournamentTemplate[] = [];

  private constructor() {
    this.initializeDefaultTemplates();
  }

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates() {
    this.templates = [
      {
        id: 'swiss-5-round',
        name: '5-Round Swiss Tournament',
        description: 'Standard 5-round Swiss system tournament',
        format: 'swiss',
        settings: {
          tie_break_criteria: ['buchholz', 'sonnebornBerger'],
          pairing_type: 'standard',
          pairing_method: 'us_chess',
          bye_points: 0.5,
          enable_analytics: true,
          enable_dark_mode: true,
          enable_keyboard_shortcuts: true,
          enable_qr_codes: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'blitz-tournament',
        name: 'Blitz Tournament',
        description: 'Fast-paced blitz tournament with 5+0 time control',
        format: 'swiss',
        settings: {
          blitz_rapid_settings: {
            time_control: '5+0',
            rounds_per_day: 7,
            break_duration: 5,
            pairing_interval: 10
          },
          pairing_type: 'accelerated',
          enable_analytics: true,
          enable_qr_codes: true,
          enable_time_tracking: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'rapid-tournament',
        name: 'Rapid Tournament',
        description: 'Rapid tournament with 15+10 time control',
        format: 'swiss',
        settings: {
          blitz_rapid_settings: {
            time_control: '15+10',
            rounds_per_day: 3,
            break_duration: 30,
            pairing_interval: 20
          },
          pairing_type: 'standard',
          enable_analytics: true,
          enable_qr_codes: true,
          enable_time_tracking: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'quad-tournament',
        name: 'Quad Tournament',
        description: 'Quad system tournament - players grouped into quads of 4',
        format: 'swiss',
        settings: {
          tie_break_criteria: ['buchholz', 'sonnebornBerger'],
          pairing_type: 'standard',
          pairing_method: 'quad',
          bye_points: 0.5,
          enable_analytics: true,
          enable_dark_mode: true,
          enable_keyboard_shortcuts: true,
          enable_qr_codes: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'round-robin-tournament',
        name: 'Round Robin Tournament',
        description: 'Round robin tournament - all players play each other once',
        format: 'swiss',
        settings: {
          tie_break_criteria: ['buchholz', 'sonnebornBerger'],
          pairing_type: 'standard',
          pairing_method: 'round_robin',
          bye_points: 0.5,
          enable_analytics: true,
          enable_dark_mode: true,
          enable_keyboard_shortcuts: true,
          enable_qr_codes: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'team-tournament',
        name: 'Team Swiss Tournament',
        description: 'Team tournament with 4 boards per team',
        format: 'team-swiss',
        settings: {
          team_board_count: 4,
          team_tie_break_criteria: ['match_points', 'game_points', 'buchholz'],
          pairing_type: 'standard',
          enable_analytics: true,
          enable_qr_codes: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'knockout-tournament',
        name: 'Knockout Tournament',
        description: 'Single elimination knockout tournament',
        format: 'swiss',
        settings: {
          knockout_settings: {
            seeding_method: 'rating',
            consolation_bracket: true,
            third_place_playoff: true
          },
          enable_analytics: true,
          enable_qr_codes: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'simultaneous-exhibition',
        name: 'Simultaneous Exhibition',
        description: 'Simultaneous exhibition with master',
        format: 'swiss',
        settings: {
          simultaneous_settings: {
            max_boards: 20,
            time_control: 'G/30',
            simultaneous_type: 'single'
          },
          enable_analytics: true,
          enable_qr_codes: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'multi-day-tournament',
        name: 'Multi-Day Tournament',
        description: 'Tournament spanning multiple days',
        format: 'swiss',
        settings: {
          multi_day_schedule: [
            {
              id: 'day1',
              tournament_id: '',
              day_number: 1,
              date: new Date().toISOString().split('T')[0],
              rounds: [1, 2, 3],
              start_time: '09:00',
              end_time: '18:00',
              location: 'Main Hall'
            },
            {
              id: 'day2',
              tournament_id: '',
              day_number: 2,
              date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              rounds: [4, 5, 6],
              start_time: '09:00',
              end_time: '18:00',
              location: 'Main Hall'
            },
            {
              id: 'day3',
              tournament_id: '',
              day_number: 3,
              date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
              rounds: [7],
              start_time: '10:00',
              end_time: '16:00',
              location: 'Main Hall'
            }
          ],
          enable_analytics: true,
          enable_qr_codes: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'scholastic-tournament',
        name: 'Scholastic Tournament',
        description: 'Tournament designed for school chess clubs',
        format: 'swiss',
        settings: {
          tie_break_criteria: ['buchholz', 'sonnebornBerger'],
          sections: [
            { name: 'K-3', min_rating: 0, max_rating: 800 },
            { name: '4-6', min_rating: 800, max_rating: 1200 },
            { name: '7-9', min_rating: 1200, max_rating: 1600 },
            { name: '10-12', min_rating: 1600, max_rating: 2000 }
          ],
          pairing_type: 'standard',
          enable_analytics: true,
          enable_qr_codes: true,
          enable_player_photos: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'senior-tournament',
        name: 'Senior Tournament',
        description: 'Tournament for senior players (50+)',
        format: 'swiss',
        settings: {
          tie_break_criteria: ['buchholz', 'sonnebornBerger'],
          rating_floor: 1200,
          pairing_type: 'standard',
          enable_analytics: true,
          enable_qr_codes: true,
          enable_time_tracking: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      },
      {
        id: 'open-tournament',
        name: 'Open Tournament',
        description: 'Open tournament for all players',
        format: 'swiss',
        settings: {
          tie_break_criteria: ['buchholz', 'sonnebornBerger', 'performanceRating'],
          sections: [
            { name: 'Open', min_rating: 0 },
            { name: 'Reserve', min_rating: 0, max_rating: 1800 }
          ],
          pairing_type: 'accelerated',
          acceleration_type: 'standard',
          acceleration_rounds: 2,
          enable_analytics: true,
          enable_qr_codes: true,
          enable_bulk_operations: true
        },
        is_public: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        usage_count: 0
      }
    ];
  }

  /**
   * Get all templates
   */
  getTemplates(): TournamentTemplate[] {
    return [...this.templates];
  }

  /**
   * Get public templates
   */
  getPublicTemplates(): TournamentTemplate[] {
    return this.templates.filter(template => template.is_public);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): TournamentTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  /**
   * Get templates by format
   */
  getTemplatesByFormat(format: string): TournamentTemplate[] {
    return this.templates.filter(template => template.format === format);
  }

  /**
   * Create new template
   */
  createTemplate(template: Omit<TournamentTemplate, 'id' | 'created_at' | 'usage_count'>): TournamentTemplate {
    const newTemplate: TournamentTemplate = {
      ...template,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      usage_count: 0
    };

    this.templates.push(newTemplate);
    this.saveTemplates();
    return newTemplate;
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<TournamentTemplate>): TournamentTemplate | null {
    const index = this.templates.findIndex(template => template.id === id);
    if (index === -1) return null;

    this.templates[index] = { ...this.templates[index], ...updates };
    this.saveTemplates();
    return this.templates[index];
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(template => template.id === id);
    if (index === -1) return false;

    this.templates.splice(index, 1);
    this.saveTemplates();
    return true;
  }

  /**
   * Use template (increment usage count)
   */
  useTemplate(id: string): TournamentTemplate | null {
    const template = this.getTemplate(id);
    if (!template) return null;

    template.usage_count++;
    this.saveTemplates();
    return template;
  }

  /**
   * Get most popular templates
   */
  getPopularTemplates(limit: number = 5): TournamentTemplate[] {
    return [...this.templates]
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): TournamentTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.templates.filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.format.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get template settings for tournament creation
   */
  getTemplateSettings(id: string): TournamentSettings | null {
    const template = this.getTemplate(id);
    return template ? template.settings : null;
  }

  /**
   * Clone template
   */
  cloneTemplate(id: string, newName: string, createdBy: string): TournamentTemplate | null {
    const originalTemplate = this.getTemplate(id);
    if (!originalTemplate) return null;

    const clonedTemplate: TournamentTemplate = {
      ...originalTemplate,
      id: this.generateId(),
      name: newName,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      usage_count: 0,
      is_public: false // Cloned templates are private by default
    };

    this.templates.push(clonedTemplate);
    this.saveTemplates();
    return clonedTemplate;
  }

  /**
   * Export template
   */
  exportTemplate(id: string): string | null {
    const template = this.getTemplate(id);
    if (!template) return null;

    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template
   */
  importTemplate(templateJson: string, createdBy: string): TournamentTemplate | null {
    try {
      const templateData = JSON.parse(templateJson);
      const template: TournamentTemplate = {
        ...templateData,
        id: this.generateId(),
        created_by: createdBy,
        created_at: new Date().toISOString(),
        usage_count: 0
      };

      this.templates.push(template);
      this.saveTemplates();
      return template;
    } catch (error) {
      console.error('Error importing template:', error);
      return null;
    }
  }

  /**
   * Save templates to localStorage
   */
  private saveTemplates() {
    try {
      localStorage.setItem('tournament_templates', JSON.stringify(this.templates));
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }

  /**
   * Load templates from localStorage
   */
  private loadTemplates() {
    try {
      const saved = localStorage.getItem('tournament_templates');
      if (saved) {
        const parsedTemplates = JSON.parse(saved);
        // Merge with default templates, keeping defaults for system templates
        const systemTemplateIds = this.templates.map(t => t.id);
        const customTemplates = parsedTemplates.filter((t: TournamentTemplate) => 
          !systemTemplateIds.includes(t.id)
        );
        this.templates = [...this.templates, ...customTemplates];
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
export const templateService = TemplateService.getInstance();
