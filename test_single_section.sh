#!/bin/bash
echo "Testing single section pairing generation..."
echo "Clearing existing pairings..."
curl -s -X DELETE http://localhost:5000/api/pairings/tournament/0bdb4141-8754-4afb-b384-6b88aac107c4/round/1 > /dev/null
sleep 1
echo "Generating pairings for Open section only..."
curl -s -X POST http://localhost:5000/api/pairings/generate/section \
  -H "Content-Type: application/json" \
  -d '{"tournamentId": "0bdb4141-8754-4afb-b384-6b88aac107c4", "round": 1, "sectionName": "Open"}' \
  | jq '.message, (.pairings | length)'
echo "Done. Check server logs to see if only Open section was generated."
