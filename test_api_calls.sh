#!/bin/bash
echo "Testing API calls..."
echo "Clearing existing pairings..."
curl -s -X DELETE http://localhost:5000/api/pairings/tournament/0bdb4141-8754-4afb-b384-6b88aac107c4/round/1 > /dev/null
sleep 2
echo ""
echo "Now watch the server logs when you click 'Generate Pairings' for the Open section in the UI."
echo "The logs should show ONLY section-specific generation, not general generation."
echo ""
echo "If you see both general AND section-specific generation, then the frontend is making multiple API calls."
