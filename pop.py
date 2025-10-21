import pandas as pd
from io import StringIO
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# --- Configuration ---
URL = "https://new.uschess.org/civicrm/player-search"
SEARCH_QUERY = "Chugh"

# Increase Timeout for Robustness
INITIAL_WAIT_TIME = 10000  # Wait time for the initial input field to load
RESULTS_WAIT_TIME = 15000  # Wait time for the search results to populate the table

def get_uscf_player_data(search_term):
    """
    Performs a search on the US Chess Player Search site, waits for the table 
    content to load, and returns the results, with increased robustness to timeouts.
    """
    print(f"Starting headless search for: {search_term}...")

    # Set up Chrome options for headless mode and a user-agent
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        driver.get(URL)
        print("Navigated to URL.")

        # --- STEP 1: Locate and fill the name input field ---
        name_input_locator = (By.ID, "display-name-2")
        name_input = WebDriverWait(driver, INITIAL_WAIT_TIME).until(
            EC.presence_of_element_located(name_input_locator)
        )
        name_input.send_keys(search_term)
        print(f"Entered search term: {search_term}")

        # --- STEP 2: Locate and click the explicit Search button ---
        # Locator for the button based on the provided HTML
        search_button_locator = (By.XPATH, "//button[contains(@class, 'btn-primary') and normalize-space(.)='Search']")
        
        search_button = WebDriverWait(driver, INITIAL_WAIT_TIME).until(
            EC.element_to_be_clickable(search_button_locator)
        )
        search_button.click()
        print("Clicked the explicit Search button. 🖱️")

        # --- STEP 3: Wait for the results to appear in the table ---
        # Wait for the first row (tr[1]) within the table's body (tbody) to be present.
        first_row_locator = (By.XPATH, "//table[contains(@class, 'table-bordered')]//tbody/tr[1]")
        
        WebDriverWait(driver, RESULTS_WAIT_TIME).until(
            EC.presence_of_element_located(first_row_locator)
        )
        print("Results table content loaded successfully. ✅")
        
        # Wait for actual data to load - look for cells with content
        data_cell_locator = (By.XPATH, "//table[contains(@class, 'table-bordered')]//tbody/tr[1]/td[1]")
        try:
            WebDriverWait(driver, 10).until(
                lambda driver: driver.find_element(*data_cell_locator).text.strip() != ""
            )
            print("Data cells loaded successfully. ✅")
        except:
            print("Data cells may not have loaded properly, continuing anyway...")
        
        # Additional wait to ensure data is fully loaded
        import time
        time.sleep(5)
        print("Additional wait completed for data to fully load.")

        # --- STEP 4: Extract the entire table HTML ---
        table_locator = (By.XPATH, "//table[contains(@class, 'table-bordered')]")
        html_table = driver.find_element(*table_locator).get_attribute('outerHTML')

        # --- STEP 5: Parse the HTML into a DataFrame and format output ---
        print("HTML Table content:")
        print(html_table[:1000] + "..." if len(html_table) > 1000 else html_table)
        
        try:
            data_frame = pd.read_html(StringIO(html_table))
            print(f"Number of tables found: {len(data_frame)}")
            
            if data_frame:
                results_df = data_frame[0]
                print(f"DataFrame shape: {results_df.shape}")
                print("DataFrame columns:", results_df.columns.tolist())
                print("First few rows:")
                print(results_df.head())
                
                # Check if we have any non-NaN data
                if results_df.isnull().all().all():
                    print("All data is NaN, trying to find the actual data rows...")
                    # Let's try to find the tbody rows manually using string parsing
                    import re
                    tbody_match = re.search(r'<tbody>(.*?)</tbody>', html_table, re.DOTALL)
                    if tbody_match:
                        tbody_content = tbody_match.group(1)
                        row_matches = re.findall(r'<tr[^>]*>(.*?)</tr>', tbody_content, re.DOTALL)
                        print(f"Found {len(row_matches)} rows in tbody")
                        for i, row_html in enumerate(row_matches[:3]):  # Show first 3 rows
                            cell_matches = re.findall(r'<td[^>]*>(.*?)</td>', row_html, re.DOTALL)
                            print(f"Row {i}: {len(cell_matches)} cells")
                            for j, cell_html in enumerate(cell_matches):
                                # Extract text content, removing HTML tags
                                cell_text = re.sub(r'<[^>]+>', '', cell_html).strip()
                                print(f"  Cell {j}: '{cell_text}'")
                    return "Table found but no data extracted - structure issue"
                
                # Clean up the 'Name' column 
                results_df['Name'] = results_df['Name'].apply(lambda x: x.split('\n')[-1].strip() if pd.notna(x) and isinstance(x, str) else x)
                
                # Rename columns based on your HTML headers
                results_df.columns = [
                    "Name", "Member ID", "Regular Rating", "Quick Rating", "Blitz Rating",
                    "Online Regular", "Online Quick", "Online Blitz", "Correspondence", "State", 
                    "Membership Expires"
                ]
                return results_df
            else:
                return "No data extracted from the table after search."
        except Exception as e:
            import traceback
            print(f"Error parsing HTML table: {e}")
            print(f"Full traceback: {traceback.format_exc()}")
            return f"Error parsing HTML table: {e}"

    except (TimeoutException, NoSuchElementException) as e:
        # Catch specific exceptions related to element visibility/loading
        return f"A timeout error occurred. The site might be too slow or the expected elements didn't load: {e}"
    except Exception as e:
        # Catch any other unexpected errors
        return f"An unexpected error occurred during the scraping process: {e}"
    finally:
        driver.quit()
        print("Browser closed.")

# --- Execute the function ---
results_df = get_uscf_player_data(SEARCH_QUERY)

# --- Display Results ---
print("\n" + "="*50)
print(f"USCF Player Search Results for '{SEARCH_QUERY}':")
print("="*50)

if isinstance(results_df, pd.DataFrame):
    print(results_df.to_string(index=False))
else:
    print(results_df)