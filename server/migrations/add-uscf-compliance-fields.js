/**
 * Migration: Add USCF Compliance Fields
 * Adds all required fields for USCF DBF export compliance
 */

const db = require('../database');

function addUSCFComplianceFields() {
  console.log('Adding USCF compliance fields to tournaments table...');
  
  const fields = [
    // Additional USCF-required fields
    'zipcode TEXT',
    'affiliate_id TEXT',
    'assistant_td_name TEXT',
    'assistant_td_uscf_id TEXT',
    'send_crosstable BOOLEAN DEFAULT 0',
    'scholastic_tournament BOOLEAN DEFAULT 0',
    'tournament_director_email TEXT',
    'tournament_director_phone TEXT',
    'venue_name TEXT',
    'venue_address TEXT',
    'venue_city TEXT',
    'venue_state TEXT',
    'venue_zipcode TEXT',
    'entry_fee_amount DECIMAL(10,2)',
    'prize_fund_amount DECIMAL(10,2)',
    'time_control_description TEXT',
    'rating_system TEXT DEFAULT "regular"',
    'k_factor TEXT DEFAULT "regular"',
    'pairing_system TEXT DEFAULT "swiss"',
    'bye_points DECIMAL(3,1) DEFAULT 0.5',
    'forfeit_points DECIMAL(3,1) DEFAULT 0.0',
    'half_point_bye_points DECIMAL(3,1) DEFAULT 0.5',
    'full_point_bye_points DECIMAL(3,1) DEFAULT 1.0',
    'pairing_allocated_bye_points DECIMAL(3,1) DEFAULT 1.0',
    'provisional_rating_threshold INTEGER DEFAULT 20',
    'minimum_games_for_rating INTEGER DEFAULT 4',
    'tournament_type TEXT DEFAULT "swiss"',
    'section_count INTEGER DEFAULT 1',
    'total_players INTEGER DEFAULT 0',
    'rated_players INTEGER DEFAULT 0',
    'unrated_players INTEGER DEFAULT 0',
    'foreign_players INTEGER DEFAULT 0',
    'provisional_players INTEGER DEFAULT 0',
    'withdrawn_players INTEGER DEFAULT 0',
    'forfeit_players INTEGER DEFAULT 0',
    'bye_players INTEGER DEFAULT 0',
    'half_point_bye_players INTEGER DEFAULT 0',
    'full_point_bye_players INTEGER DEFAULT 0',
    'pairing_allocated_bye_players INTEGER DEFAULT 0',
    'tournament_status TEXT DEFAULT "created"',
    'rating_submission_status TEXT DEFAULT "not_submitted"',
    'rating_submission_date TEXT',
    'rating_submission_notes TEXT',
    'uscf_tournament_id TEXT',
    'uscf_section_ids TEXT',
    'uscf_rating_report_generated BOOLEAN DEFAULT 0',
    'uscf_rating_report_date TEXT',
    'uscf_rating_report_notes TEXT',
    'compliance_notes TEXT',
    'regulatory_notes TEXT',
    'audit_trail TEXT',
    'created_by TEXT',
    'last_modified_by TEXT',
    'last_modified_date TEXT',
    'version TEXT DEFAULT "1.0"',
    'compliance_version TEXT DEFAULT "uscf_2024"',
    'export_format_version TEXT DEFAULT "dbf_iv"',
    'data_integrity_hash TEXT',
    'validation_status TEXT DEFAULT "pending"',
    'validation_notes TEXT',
    'validation_date TEXT',
    'validation_by TEXT'
  ];

  fields.forEach(field => {
    const alterQuery = `ALTER TABLE tournaments ADD COLUMN ${field}`;
    db.run(alterQuery, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`Error adding column ${field}:`, err.message);
      } else if (!err) {
        console.log(`✓ Added column: ${field.split(' ')[0]}`);
      }
    });
  });

  console.log('USCF compliance fields migration completed.');
}

module.exports = { addUSCFComplianceFields };

// Run migration if called directly
if (require.main === module) {
  addUSCFComplianceFields();
}
