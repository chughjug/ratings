export interface Tournament {
  id: string;
  organization_id?: string;
  name: string;
  format: 'swiss' | 'online' | 'quad' | 'team-swiss';
  rounds: number;
  time_control?: string;
  start_date?: string;
  end_date?: string;
  status: 'created' | 'active' | 'completed' | 'cancelled';
  settings?: TournamentSettings;
  created_at: string;
  
  // USCF Compliance Fields - Required for DBF Export
  // Location Information
  city?: string;
  state?: string;
  zipcode?: string;
  location?: string;
  venue_name?: string;
  venue_address?: string;
  venue_city?: string;
  venue_state?: string;
  venue_zipcode?: string;
  
  // Tournament Director Information
  chief_td_name?: string;
  chief_td_uscf_id?: string;
  chief_td_email?: string;
  chief_td_phone?: string;
  assistant_td_name?: string;
  assistant_td_uscf_id?: string;
  
  // USCF Administrative Fields
  affiliate_id?: string;
  uscf_tournament_id?: string;
  uscf_section_ids?: string;
  
  // Tournament Classification
  scholastic_tournament?: boolean;
  fide_rated?: boolean;
  uscf_rated?: boolean;
  send_crosstable?: boolean;
  
  // Rating System Configuration
  rating_system?: 'regular' | 'quick' | 'blitz';
  k_factor?: 'regular' | 'scholastic' | 'provisional';
  pairing_system?: 'swiss' | 'round_robin';
  tournament_type?: 'swiss' | 'round_robin';
  
  // Scoring Configuration
  bye_points?: number;
  forfeit_points?: number;
  half_point_bye_points?: number;
  full_point_bye_points?: number;
  pairing_allocated_bye_points?: number;
  
  // Rating Thresholds
  provisional_rating_threshold?: number;
  minimum_games_for_rating?: number;
  
  // Player Statistics
  expected_players?: number;
  total_players?: number;
  rated_players?: number;
  unrated_players?: number;
  foreign_players?: number;
  provisional_players?: number;
  withdrawn_players?: number;
  forfeit_players?: number;
  bye_players?: number;
  half_point_bye_players?: number;
  full_point_bye_players?: number;
  pairing_allocated_bye_players?: number;
  
  // Tournament Management
  allow_registration?: boolean;
  is_public?: boolean;
  public_url?: string;
  logo_url?: string;
  tournament_information?: string;
  website?: string;
  entry_fee_amount?: number;
  prize_fund_amount?: number;
  time_control_description?: string;
  
  // USCF Export Status
  rating_submission_status?: 'not_submitted' | 'submitted' | 'accepted' | 'rejected';
  rating_submission_date?: string;
  rating_submission_notes?: string;
  uscf_rating_report_generated?: boolean;
  uscf_rating_report_date?: string;
  uscf_rating_report_notes?: string;
  
  // Compliance and Validation
  compliance_notes?: string;
  regulatory_notes?: string;
  audit_trail?: string;
  validation_status?: 'pending' | 'validated' | 'failed';
  validation_notes?: string;
  validation_date?: string;
  validation_by?: string;
  
  // System Fields
  created_by?: string;
  last_modified_by?: string;
  last_modified_date?: string;
  version?: string;
  compliance_version?: string;
  export_format_version?: string;
  data_integrity_hash?: string;
  
  // Legacy fields for backward compatibility
  chief_arbiter_name?: string;
  chief_arbiter_fide_id?: string;
  chief_organizer_name?: string;
  chief_organizer_fide_id?: string;
  // Multi-day tournament fields
  days?: TournamentDay[];
  // Simultaneous exhibition fields
  simultaneous_boards?: number;
  simultaneous_players?: SimultaneousPlayer[];
}

export interface Section {
  name: string;
  min_rating?: number;
  max_rating?: number;
  description?: string;
}

export interface Prize {
  id: string;
  name: string;
  type: 'cash' | 'trophy' | 'medal' | 'plaque';
  position?: number; // For position-based prizes (1st, 2nd, 3rd, etc.)
  rating_category?: string; // For rating-based prizes (e.g., "Under 1600")
  section?: string; // For section-specific prizes
  amount?: number; // For cash prizes
  description?: string;
  conditions?: string[]; // Special conditions like "biggest upset", "best game"
}

export interface PrizeDistribution {
  player_id: string;
  player_name: string;
  prize_id: string;
  prize_name: string;
  prize_type: 'cash' | 'trophy' | 'medal' | 'plaque';
  amount?: number;
  position?: number;
  rating_category?: string;
  section?: string;
  tie_group?: number; // For players who tied and split prizes
}

export interface TournamentSettings {
  tie_break_criteria?: ('buchholz' | 'sonnebornBerger' | 'performanceRating' | 'modifiedBuchholz' | 'cumulative' | 'koya' | 'directEncounter' | 'avgOpponentRating')[];
  sections?: Section[];
  rating_floor?: number;
  rating_ceiling?: number;
  bye_points?: number;
  pairing_type?: 'standard' | 'accelerated';
  pairing_method?: 'us_chess' | 'fide_dutch' | 'round_robin' | 'quad' | 'single_elimination';
  equalization_limit?: number;
  alternation_limit?: number;
  use_full_color_history?: boolean;
  due_color_to_higher_ranked?: boolean;
  avoid_dropping_unrated?: boolean;
  acceleration_type?: 'standard' | 'sixths' | 'all_rounds' | 'added_score';
  acceleration_rounds?: number; // Number of rounds to use acceleration (default: 2)
  acceleration_threshold?: number; // Minimum players to trigger acceleration (default: 2^(rounds+1))
  acceleration_break_point?: number; // Custom break point for A/B groups
  added_score_accelerators?: boolean; // Use added score method instead of standard accelerated
  prizes?: PrizeSettings;
  entry_fee?: number;
  prize_fund?: number;
  // Prize settings
  prize_settings?: PrizeSettings;
  // Team tournament settings
  team_board_count?: number;
  team_tie_break_criteria?: ('match_points' | 'game_points' | 'buchholz' | 'sonnebornBerger')[];
  // Round-robin settings
  double_round_robin?: boolean;
  // Analytics settings
  enable_analytics?: boolean;
  public_analytics?: boolean;
  // Enhanced pairing settings
  enable_manual_override?: boolean;
  enable_color_preferences?: boolean;
  enable_pairing_validation?: boolean;
  pairing_history_display?: boolean;
  // Blitz/Rapid settings
  blitz_rapid_settings?: BlitzRapidSettings;
  // Multi-day settings
  multi_day_schedule?: TournamentDay[];
  // Simultaneous exhibition settings
  simultaneous_settings?: {
    max_boards: number;
    time_control: string;
    simultaneous_type: 'single' | 'multiple';
  };
  // Knockout tournament settings
  knockout_settings?: {
    seeding_method: 'rating' | 'random' | 'manual';
    consolation_bracket: boolean;
    third_place_playoff: boolean;
  };
  // Quad tournament settings
  quad_settings?: {
    group_size: number; // Always 4 for quad
    pairing_type: 'round_robin' | 'swiss'; // How to pair within each quad
    group_assignment: 'rating' | 'random' | 'custom'; // How to assign players to groups
    min_players_per_group?: number;
    allow_byes_in_groups?: boolean;
    cross_group_pairings?: boolean; // Allow pairings across groups in later rounds
  };
  // Export and reporting settings
  export_settings?: {
    enable_custom_reports: boolean;
    default_report_template: string;
    auto_generate_reports: boolean;
  };
  // Quick wins settings
  enable_dark_mode?: boolean;
  enable_keyboard_shortcuts?: boolean;
  enable_bulk_operations?: boolean;
  enable_qr_codes?: boolean;
  enable_player_photos?: boolean;
  enable_time_tracking?: boolean;
  enable_tournament_archives?: boolean;
}

export interface PrizeSettings {
  enabled: boolean;
  autoAssign: boolean; // Auto-assign prizes when final round is completed
  sections: PrizeSection[];
}

export interface PrizeSection {
  name: string;
  prizes: PrizeConfiguration[];
}

export interface PrizeConfiguration {
  name: string;
  type: 'cash' | 'trophy' | 'medal' | 'plaque';
  position?: number; // For position-based prizes (1st, 2nd, 3rd, etc.)
  ratingCategory?: string; // For rating-based prizes (e.g., "Under 1600", "Class A", "Unrated")
  amount?: number; // For cash prizes
  description?: string;
}

export interface PrizeStructure {
  open?: {
    cash: Array<{ position: number; amount: number }>;
    trophies: Array<{ position: number; type: string }>;
    under_sections: Array<{
      rating: number;
      cash: Array<{ position: number; amount: number }>;
      trophies: Array<{ position: number; type: string }>;
    }>;
  };
  [sectionName: string]: any; // Allow custom sections
}

export interface Player {
  id: string;
  tournament_id: string;
  name: string;
  uscf_id?: string;
  fide_id?: string;
  rating?: number;
  section?: string;
  status: 'active' | 'withdrawn' | 'bye' | 'inactive';
  expiration_date?: string;
  intentional_bye_rounds?: number[];
  notes?: string;
  team_id?: string;
  team_name?: string;
  created_at: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  captain_id?: string;
  captain_name?: string;
  board_count: number;
  status: 'active' | 'withdrawn';
  member_count?: number;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  player_id: string;
  board_number: number;
  name?: string;
  rating?: number;
  uscf_id?: string;
  fide_id?: string;
  created_at: string;
}

export interface TeamResult {
  id: string;
  tournament_id: string;
  team_id: string;
  round: number;
  opponent_team_id?: string;
  team_score: number;
  opponent_score: number;
  result: 'win' | 'loss' | 'draw';
  team_name?: string;
  opponent_team_name?: string;
  created_at: string;
}

export interface TournamentAnalytics {
  overview: any;
  playerPerformance: any[];
  ratingPerformance: any[];
  sectionPerformance: any[];
  gameDistribution: any[];
  colorPerformance: any[];
  roundAnalysis: any[];
  topPerformers: any[];
  generatedAt: string;
}

export interface Pairing {
  id: string;
  tournament_id: string;
  round: number;
  board: number;
  white_player_id: string;
  black_player_id: string;
  result?: string;
  created_at: string;
  white_name?: string;
  white_rating?: number;
  white_uscf_id?: string;
  white_lichess_username?: string;
  black_name?: string;
  black_rating?: number;
  black_uscf_id?: string;
  black_lichess_username?: string;
  is_bye?: boolean;
  section?: string;
  white_id?: string;
  black_id?: string;
}

export interface Result {
  id: string;
  tournament_id: string;
  player_id: string;
  round: number;
  opponent_id?: string;
  color: 'white' | 'black';
  result: '1-0' | '0-1' | '1/2-1/2' | '1-0F' | '0-1F' | '1/2-1/2F';
  points: number;
  created_at: string;
}

export interface Standing {
  id: string;
  name: string;
  rating?: number;
  section?: string;
  total_points: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
  tiebreakers?: {
    buchholz?: number;
    sonnebornBerger?: number;
    performanceRating?: number;
    modifiedBuchholz?: number;
    cumulative?: number;
  };
}

export interface PlayerInactiveRound {
  id: string;
  tournament_id: string;
  player_id: string;
  round: number;
  reason?: string;
  created_at: string;
}

// Advanced Tournament Format Interfaces

export interface TournamentDay {
  id: string;
  tournament_id: string;
  day_number: number;
  date: string;
  rounds: number[];
  start_time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
}

export interface SimultaneousPlayer {
  id: string;
  tournament_id: string;
  player_id: string;
  board_number: number;
  name: string;
  rating?: number;
  result?: 'win' | 'loss' | 'draw';
  notes?: string;
}

export interface KnockoutBracket {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id?: string;
  player2_id?: string;
  winner_id?: string;
  result?: string;
  board_number: number;
  is_bye: boolean;
}

export interface BlitzRapidSettings {
  time_control: string;
  increment?: number;
  delay?: number;
  rounds_per_day?: number;
  break_duration?: number;
  pairing_interval?: number;
}

// Enhanced Pairing System Interfaces

export interface PairingHistory {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  round: number;
  result?: string;
  created_at: string;
}

export interface ColorPreference {
  id: string;
  tournament_id: string;
  player_id: string;
  preferred_color: 'white' | 'black' | 'either';
  priority: number;
  created_at: string;
}

export interface PairingOverride {
  id: string;
  tournament_id: string;
  round: number;
  original_pairing_id: string;
  new_white_player_id: string;
  new_black_player_id: string;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface PairingValidation {
  is_valid: boolean;
  warnings: string[];
  errors: string[];
  repeat_pairings: string[];
  color_imbalances: string[];
  rating_differences: string[];
}

// Advanced Export & Reporting Interfaces

export interface CustomReport {
  id: string;
  tournament_id: string;
  name: string;
  type: 'standings' | 'pairings' | 'results' | 'analytics' | 'custom';
  template: ReportTemplate;
  filters: ReportFilters;
  created_at: string;
  created_by: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: string;
  sections: ReportSection[];
  styling: ReportStyling;
  is_public: boolean;
  created_at: string;
}

export interface ReportSection {
  id: string;
  type: 'table' | 'chart' | 'text' | 'image';
  title: string;
  data_source: string;
  columns?: string[];
  chart_type?: 'bar' | 'line' | 'pie' | 'scatter';
  position: { x: number; y: number; width: number; height: number };
  styling?: any;
}

export interface ReportFilters {
  sections?: string[];
  rounds?: number[];
  players?: string[];
  date_range?: { start: string; end: string };
  rating_range?: { min: number; max: number };
  status?: string[];
}

export interface ReportStyling {
  font_family: string;
  font_size: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  layout: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
}

export interface DataVisualization {
  id: string;
  tournament_id: string;
  type: 'chart' | 'graph' | 'table' | 'heatmap';
  title: string;
  data: any[];
  config: VisualizationConfig;
  created_at: string;
}

export interface VisualizationConfig {
  chart_type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'histogram';
  x_axis?: string;
  y_axis?: string;
  color_by?: string;
  size_by?: string;
  filters?: any;
  styling?: any;
}

// Quick Wins Interfaces

export interface TournamentTemplate {
  id: string;
  name: string;
  description: string;
  format: string;
  settings: TournamentSettings;
  is_public: boolean;
  created_by: string;
  created_at: string;
  usage_count: number;
}

export interface PlayerPhoto {
  id: string;
  tournament_id: string;
  player_id: string;
  photo_url: string;
  uploaded_at: string;
}

export interface TimeControl {
  id: string;
  tournament_id: string;
  round: number;
  time_per_player: number; // in minutes
  increment: number; // in seconds
  delay?: number; // in seconds
  time_control_string: string;
}

export interface TournamentArchive {
  id: string;
  tournament_id: string;
  archive_name: string;
  archive_type: 'full' | 'standings' | 'pairings' | 'results';
  file_path: string;
  file_size: number;
  created_at: string;
  created_by: string;
}

// Organization Interfaces

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  settings?: OrganizationSettings;
  role?: 'owner' | 'admin' | 'member';
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    borderColor?: string;
    hoverColor?: string;
    shadowColor?: string;
    gradientColors?: string[];
    borderRadius?: string;
    spacing?: string;
  };
  branding?: {
    logoUrl?: string;
    faviconUrl?: string;
    customFont?: string;
    headerText?: string;
    tagline?: string;
    customCss?: string;
    customFontUrl?: string;
    logoPosition?: 'left' | 'center' | 'right';
    logoSize?: 'small' | 'medium' | 'large';
  };
  layout?: {
    headerStyle?: 'default' | 'minimal' | 'hero' | 'sidebar' | 'floating';
    sidebarPosition?: 'left' | 'right' | 'none';
    cardStyle?: 'default' | 'modern' | 'classic' | 'minimal' | 'elevated';
    showStats?: boolean;
    showSocialLinks?: boolean;
    showBreadcrumbs?: boolean;
    showSearch?: boolean;
    showFilters?: boolean;
    gridColumns?: number;
    animationStyle?: 'none' | 'fade' | 'slide' | 'scale';
  };
  content?: {
    showAnnouncements?: boolean;
    showCalendar?: boolean;
    showNews?: boolean;
    showContactInfo?: boolean;
    customFooter?: string;
    welcomeMessage?: string;
    aboutSection?: string;
    defaultTournamentInfo?: string;
    showSchedule?: boolean;
    showLocation?: boolean;
    showOfficials?: boolean;
    showRating?: boolean;
    showRegistration?: boolean;
    showStats?: boolean;
    customWidgets?: CustomWidget[];
  };
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    discord?: string;
    linkedin?: string;
    twitch?: string;
    tiktok?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
    customHeadHtml?: string;
    customBodyHtml?: string;
    robotsIndex?: boolean;
    canonicalUrl?: string;
  };
  advanced?: {
    customDomain?: string;
    analyticsId?: string;
    trackingCode?: string;
    customScripts?: string;
    enableDarkMode?: boolean;
    enableRtl?: boolean;
    enablePwa?: boolean;
    customManifest?: string;
  };
  features?: {
    enablePublicTournaments?: boolean;
    enableMemberInvitations?: boolean;
    enableCustomBranding?: boolean;
    enableAdvancedAnalytics?: boolean;
  };
  limits?: {
    maxTournaments?: number;
    maxMembers?: number;
    maxPlayersPerTournament?: number;
  };
}

export interface CustomWidget {
  id: string;
  type: 'text' | 'image' | 'video' | 'map' | 'countdown' | 'stats' | 'testimonial';
  title: string;
  content: string;
  position: 'header' | 'sidebar' | 'footer' | 'content';
  order: number;
  settings: any;
}

export interface OrganizationMember {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  invitedBy?: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
  invitedBy: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  createdAt: string;
  acceptedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'td' | 'user';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}
