from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import sqlite3
import time
import sys

def get_uschess_info(player_id):
    # Configure headless Chrome
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')

    try:
        # Initialize WebDriver with automatic driver management
        driver = webdriver.Chrome(service=webdriver.chrome.service.Service(ChromeDriverManager().install()), options=chrome_options)
        
        # First, try to get the rating from the beta-ratings page
        rating = None
        try:
            url_beta = f"https://beta-ratings.uschess.org/player/{player_id}"
            driver.get(url_beta)
            rating_div = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((
                    By.XPATH,
                    '//div[contains(@class, "relative flex flex-col gap-0.5 overflow-clip")]' +
                    '//div[contains(@class, "text-lg font-semibold leading-none")]'
                ))
            )
            rating = rating_div.text.strip()
        except (TimeoutException, NoSuchElementException) as e:
            print(f"Could not retrieve rating from beta-ratings page: {str(e)}")

        # Get the expiration date from the MSA page
        url_msa = f"https://www.uschess.org/msa/MbrDtlMain.php?{player_id}"
        driver.get(url_msa)
        expiration_td = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((
                By.XPATH,
                '//tr[td[contains(text(), "Expiration Dt.")]]/td/b'
            ))
        )
        expiration_date = expiration_td.text.strip()

        return {
            'rating': rating if rating else "Not found",
            'expiration_date': expiration_date,
            'player_id': player_id
        }

    except (TimeoutException, NoSuchElementException) as e:
        print(f"Error scraping data for player {player_id}: {str(e)}")
        return None

    finally:
        driver.quit()

def get_all_tournaments_from_db():
    """Get all tournaments from the database"""
    db_path = '/Users/aarushchugh/ratings/server/chess_tournaments.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, status 
        FROM tournaments 
        ORDER BY created_at DESC
    """)
    
    tournaments = cursor.fetchall()
    conn.close()
    return tournaments

def get_players_by_tournament(tournament_id):
    """Get all players with USCF IDs for a specific tournament"""
    db_path = '/Users/aarushchugh/ratings/server/chess_tournaments.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, uscf_id, rating, section, status
        FROM players 
        WHERE tournament_id = ? AND uscf_id IS NOT NULL AND uscf_id != ''
        ORDER BY name
    """, (tournament_id,))
    
    players = cursor.fetchall()
    conn.close()
    return players

def get_all_players_from_db():
    """Get all players with USCF IDs from the database (legacy function)"""
    db_path = '/Users/aarushchugh/ratings/server/chess_tournaments.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, uscf_id, rating 
        FROM players 
        WHERE uscf_id IS NOT NULL AND uscf_id != ''
    """)
    
    players = cursor.fetchall()
    conn.close()
    return players

def update_player_rating_and_expiration(player_id, rating, expiration_date):
    """Update player's rating and expiration date in the database"""
    db_path = '/Users/aarushchugh/ratings/server/chess_tournaments.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Update rating if we got a valid one
    if rating and rating != "Not found":
        try:
            rating_int = int(rating.replace(',', ''))  # Remove commas from rating
            cursor.execute("""
                UPDATE players 
                SET rating = ? 
                WHERE id = ?
            """, (rating_int, player_id))
        except ValueError:
            print(f"Could not convert rating '{rating}' to integer for player {player_id}")
    
    # Add expiration date to a new column (we'll need to add this column first)
    try:
        cursor.execute("""
            ALTER TABLE players ADD COLUMN expiration_date TEXT
        """)
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    cursor.execute("""
        UPDATE players 
        SET expiration_date = ? 
        WHERE id = ?
    """, (expiration_date, player_id))
    
    conn.commit()
    conn.close()

def process_all_tournaments_and_players():
    """Process all tournaments and their players to get ratings and expiration dates"""
    tournaments = get_all_tournaments_from_db()
    
    if not tournaments:
        print("No tournaments found in the database.")
        return
    
    print(f"Found {len(tournaments)} tournaments. Starting lookup process...")
    
    total_players_processed = 0
    total_successful_updates = 0
    total_failed_updates = 0
    
    for tournament_id, tournament_name, tournament_status in tournaments:
        print(f"\n{'='*60}")
        print(f"TOURNAMENT: {tournament_name}")
        print(f"Status: {tournament_status}")
        print(f"{'='*60}")
        
        players = get_players_by_tournament(tournament_id)
        
        if not players:
            print("No players with USCF IDs found in this tournament.")
            continue
        
        print(f"Found {len(players)} players with USCF IDs in this tournament.")
        
        tournament_successful = 0
        tournament_failed = 0
        
        for i, (player_id, name, uscf_id, current_rating, section, status) in enumerate(players, 1):
            print(f"\n[{i}/{len(players)}] {name}")
            print(f"  USCF ID: {uscf_id}")
            print(f"  Section: {section}")
            print(f"  Status: {status}")
            if current_rating:
                print(f"  Current Rating: {current_rating}")
            
            try:
                player_info = get_uschess_info(uscf_id)
                
                if player_info:
                    print(f"  ✓ Retrieved Rating: {player_info['rating']}")
                    print(f"  ✓ Expiration Date: {player_info['expiration_date']}")
                    
                    # Update the database
                    update_player_rating_and_expiration(
                        player_id, 
                        player_info['rating'], 
                        player_info['expiration_date']
                    )
                    
                    tournament_successful += 1
                    print(f"  ✓ Database updated successfully")
                else:
                    print(f"  ✗ Failed to retrieve information from USCF")
                    tournament_failed += 1
                    
            except Exception as e:
                print(f"  ✗ Error processing {name}: {str(e)}")
                tournament_failed += 1
            
            # Add a small delay to be respectful to the servers
            time.sleep(2)
        
        print(f"\n--- Tournament Summary ---")
        print(f"Players processed: {len(players)}")
        print(f"Successful updates: {tournament_successful}")
        print(f"Failed updates: {tournament_failed}")
        
        total_players_processed += len(players)
        total_successful_updates += tournament_successful
        total_failed_updates += tournament_failed
    
    print(f"\n{'='*60}")
    print(f"OVERALL SUMMARY")
    print(f"{'='*60}")
    print(f"Total tournaments processed: {len(tournaments)}")
    print(f"Total players processed: {total_players_processed}")
    print(f"Total successful updates: {total_successful_updates}")
    print(f"Total failed updates: {total_failed_updates}")

def process_all_players():
    """Process all players in the database to get their ratings and expiration dates (legacy function)"""
    players = get_all_players_from_db()
    
    if not players:
        print("No players with USCF IDs found in the database.")
        return
    
    print(f"Found {len(players)} players with USCF IDs. Starting lookup process...")
    
    successful_updates = 0
    failed_updates = 0
    
    for i, (player_id, name, uscf_id, current_rating) in enumerate(players, 1):
        print(f"\n[{i}/{len(players)}] Processing {name} (USCF ID: {uscf_id})")
        
        try:
            player_info = get_uschess_info(uscf_id)
            
            if player_info:
                print(f"  Rating: {player_info['rating']}")
                print(f"  Expiration: {player_info['expiration_date']}")
                
                # Update the database
                update_player_rating_and_expiration(
                    player_id, 
                    player_info['rating'], 
                    player_info['expiration_date']
                )
                
                successful_updates += 1
                print(f"  ✓ Updated successfully")
            else:
                print(f"  ✗ Failed to retrieve information")
                failed_updates += 1
                
        except Exception as e:
            print(f"  ✗ Error processing {name}: {str(e)}")
            failed_updates += 1
        
        # Add a small delay to be respectful to the servers
        time.sleep(2)
    
    print(f"\n=== Summary ===")
    print(f"Total players processed: {len(players)}")
    print(f"Successful updates: {successful_updates}")
    print(f"Failed updates: {failed_updates}")

# Example usage
if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "all":
            process_all_players()
        elif sys.argv[1] == "tournaments":
            process_all_tournaments_and_players()
        else:
            print("Usage:")
            print("  python test.py                    - Single player lookup")
            print("  python test.py all                - Process all players (legacy)")
            print("  python test.py tournaments        - Process all tournaments and their players")
    else:
        # Single player lookup (original functionality)
        player_info = get_uschess_info("14970943")
        if player_info:
            print(f"Player ID: {player_info['player_id']}")
            print(f"Rating: {player_info['rating']}")
            print(f"Expiration Date: {player_info['expiration_date']}")
        print("\nUsage:")
        print("  python test.py all                - Process all players (legacy)")
        print("  python test.py tournaments        - Process all tournaments and their players")