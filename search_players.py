#!/usr/bin/env python3
import pandas as pd
from io import StringIO
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
import json
import sys
import os
import subprocess

# --- Configuration ---
URL = "https://beta-ratings.uschess.org"

# Optimized timeouts for speed
INITIAL_WAIT_TIME = 5000   # Reduced wait time for the initial input field to load
RESULTS_WAIT_TIME = 8000   # Reduced wait time for the search results to populate the table

def setup_chrome_driver():
    """
    Set up Chrome driver with robust error handling and fallback options
    """
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-images")  # Don't load images for speed
    chrome_options.add_argument("--disable-plugins")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-web-security")
    chrome_options.add_argument("--disable-features=VizDisplayCompositor")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # Try multiple approaches to get ChromeDriver working
    driver_paths = []
    
    # Method 1: Try WebDriverManager
    try:
        print("Attempting to use WebDriverManager...", file=sys.stderr)
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        print("WebDriverManager successful!", file=sys.stderr)
        return driver
    except Exception as e:
        print(f"WebDriverManager failed: {e}", file=sys.stderr)
    
    # Method 2: Try system ChromeDriver if available
    try:
        print("Attempting to use system ChromeDriver...", file=sys.stderr)
        # Check common locations for ChromeDriver
        possible_paths = [
            '/usr/local/bin/chromedriver',
            '/opt/homebrew/bin/chromedriver',
            '/usr/bin/chromedriver',
            'chromedriver'  # If in PATH
        ]
        
        for path in possible_paths:
            if os.path.exists(path) or path == 'chromedriver':
                try:
                    service = Service(path)
                    driver = webdriver.Chrome(service=service, options=chrome_options)
                    print(f"System ChromeDriver successful at {path}!", file=sys.stderr)
                    return driver
                except Exception as e:
                    print(f"System ChromeDriver at {path} failed: {e}", file=sys.stderr)
                    continue
    except Exception as e:
        print(f"System ChromeDriver attempt failed: {e}", file=sys.stderr)
    
    # Method 3: Try without service (let Selenium find ChromeDriver)
    try:
        print("Attempting to use ChromeDriver without explicit service...", file=sys.stderr)
        driver = webdriver.Chrome(options=chrome_options)
        print("ChromeDriver without service successful!", file=sys.stderr)
        return driver
    except Exception as e:
        print(f"ChromeDriver without service failed: {e}", file=sys.stderr)
    
    # If all methods fail, raise an error
    raise WebDriverException("Could not initialize ChromeDriver with any method. Please ensure Chrome and ChromeDriver are properly installed.")

def get_uscf_player_data(search_term, max_results=10):
    """
    Performs a search on the US Chess Beta Ratings site using the fuzzy search API.
    """
    print(f"Starting search for: {search_term}...", file=sys.stderr)

    try:
        # Use the fuzzy search API endpoint
        search_url = f"{URL}/?fuzzy={search_term}"
        print(f"Searching URL: {search_url}", file=sys.stderr)
        
        # Set up Chrome driver with robust error handling
        driver = setup_chrome_driver()
        
        try:
            driver.get(search_url)
            print("Navigated to search URL.", file=sys.stderr)

            # Wait for the search results to load
            import time
            time.sleep(3)  # Wait for the page to load
            
            # Look for search result cards
            search_cards = driver.find_elements(By.CLASS_NAME, "search-card-player")
            print(f"Found {len(search_cards)} search result cards", file=sys.stderr)
            
            players = []
            for card in search_cards[:max_results]:
                try:
                    # Extract player name
                    name_element = card.find_element(By.CSS_SELECTOR, ".font-names span")
                    name = name_element.text.strip()
                    
                    # Extract USCF ID from the link
                    link_element = card.find_element(By.CSS_SELECTOR, "a[href*='/player/']")
                    player_url = link_element.get_attribute('href')
                    uscf_id = player_url.split('/player/')[-1]
                    
                    # Extract state
                    state = None
                    try:
                        state_element = card.find_element(By.CSS_SELECTOR, ".font-sans")
                        state = state_element.text.strip()
                    except:
                        pass
                    
                    # Extract ratings from the rating badges
                    rating_badges = card.find_elements(By.CSS_SELECTOR, ".w-13")
                    ratings = {
                        'regular': None,
                        'quick': None,
                        'blitz': None,
                        'online_regular': None,
                        'online_quick': None,
                        'online_blitz': None
                    }
                    
                    for badge in rating_badges:
                        try:
                            # Get the rating type from the first span
                            rating_type_element = badge.find_element(By.CSS_SELECTOR, ".font-condensed")
                            rating_type = rating_type_element.text.strip()
                            
                            # Get the rating value from the last span
                            rating_value_element = badge.find_element(By.CSS_SELECTOR, ".font-mono")
                            rating_value = rating_value_element.text.strip()
                            
                            # Map rating types
                            if rating_type == 'R':
                                ratings['regular'] = int(rating_value) if rating_value.isdigit() else None
                            elif rating_type == 'Q':
                                ratings['quick'] = int(rating_value) if rating_value.isdigit() else None
                            elif rating_type == 'B':
                                ratings['blitz'] = int(rating_value) if rating_value.isdigit() else None
                            elif rating_type == 'OR':
                                ratings['online_regular'] = int(rating_value) if rating_value.isdigit() else None
                            elif rating_type == 'OQ':
                                ratings['online_quick'] = int(rating_value) if rating_value.isdigit() else None
                            elif rating_type == 'OB':
                                ratings['online_blitz'] = int(rating_value) if rating_value.isdigit() else None
                        except Exception as e:
                            print(f"Error parsing rating badge: {e}", file=sys.stderr)
                            continue
                    
                    # Extract expiration date
                    expiration_text = None
                    try:
                        expiration_element = card.find_element(By.XPATH, ".//span[contains(text(), 'Exp:')]")
                        expiration_text = expiration_element.text.replace('Exp: ', '').strip()
                    except:
                        pass
                    
                    # Determine primary rating
                    primary_rating = ratings['regular'] or ratings['quick'] or ratings['blitz']
                    
                    player = {
                        'name': name,
                        'memberId': uscf_id,
                        'state': state if state else None,
                        'ratings': ratings,
                        'uscf_id': uscf_id,
                        'rating': primary_rating,
                        'expiration_date': expiration_text
                    }
                    
                    players.append(player)
                    print(f"Parsed player: {name} (ID: {uscf_id}, Rating: {primary_rating})", file=sys.stderr)
                    
                except Exception as e:
                    print(f"Error parsing player card: {e}", file=sys.stderr)
                    continue
            
            print(f"Successfully found {len(players)} players", file=sys.stderr)
            return players
            
        finally:
            try:
                driver.quit()
                print("Browser closed.", file=sys.stderr)
            except:
                print("Error closing browser.", file=sys.stderr)

    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        return []

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 search_players.py <search_term> <max_results>", file=sys.stderr)
        sys.exit(1)
    
    search_term = sys.argv[1]
    max_results = int(sys.argv[2])
    
    results = get_uscf_player_data(search_term, max_results)
    print(json.dumps(results))
