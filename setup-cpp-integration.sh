#!/bin/bash

# bbpPairings C++ Integration Guide
# This script provides multiple options for integrating C++ bbpPairings

echo "🔧 bbpPairings C++ Integration Options"
echo "======================================"
echo ""

echo "📋 Available Options:"
echo "1. Download pre-compiled binary (if available)"
echo "2. Use Docker container (recommended)"
echo "3. Manual compilation with specific instructions"
echo "4. Use JavaScript implementation (fallback)"
echo ""

# Option 1: Try to download pre-compiled binary
echo "🔍 Option 1: Checking for pre-compiled binaries..."
if command -v curl &> /dev/null; then
    echo "📥 Attempting to download pre-compiled binary..."
    
    # Try to download from GitHub releases
    if curl -L -o bbpPairings-macOS "https://github.com/BieremaBoyzProgramming/bbpPairings/releases/latest/download/bbpPairings-macOS" 2>/dev/null; then
        chmod +x bbpPairings-macOS
        echo "✅ Downloaded pre-compiled binary: bbpPairings-macOS"
        echo "📍 Location: $(pwd)/bbpPairings-macOS"
        
        # Test it
        if ./bbpPairings-macOS --help 2>/dev/null; then
            echo "✅ Binary works correctly!"
            exit 0
        else
            echo "⚠️  Binary downloaded but may have issues"
        fi
    else
        echo "❌ No pre-compiled binary available for this platform"
    fi
else
    echo "❌ curl not available for downloading"
fi

echo ""

# Option 2: Docker solution
echo "🐳 Option 2: Docker Container (Recommended)"
echo "This is the most reliable method for cross-platform compatibility."
echo ""
echo "To use Docker:"
echo "1. Install Docker Desktop: https://www.docker.com/products/docker-desktop"
echo "2. Run: docker build -f Dockerfile.bbpPairings -t bbpPairings-cpp ."
echo "3. Use: docker run --rm -v \$(pwd):/data bbpPairings-cpp [options]"
echo ""

# Option 3: Manual compilation instructions
echo "🔨 Option 3: Manual Compilation"
echo "If you want to compile from source, here are the steps:"
echo ""
echo "For macOS:"
echo "1. Install Xcode Command Line Tools: xcode-select --install"
echo "2. Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
echo "3. Install dependencies: brew install gcc make"
echo "4. Navigate to bbpPairings-master directory"
echo "5. Try: make clean && make"
echo ""
echo "For Linux (Ubuntu/Debian):"
echo "1. sudo apt-get update"
echo "2. sudo apt-get install build-essential g++ make"
echo "3. Navigate to bbpPairings-master directory"
echo "4. Try: make clean && make"
echo ""
echo "For Windows:"
echo "1. Install Visual Studio with C++ tools"
echo "2. Install MSYS2 or use WSL"
echo "3. Follow Linux instructions in WSL"
echo ""

# Option 4: JavaScript fallback
echo "🔄 Option 4: JavaScript Implementation (Current)"
echo "The system currently uses a JavaScript port of the bbpPairings algorithms."
echo "This provides the same functionality without requiring C++ compilation."
echo ""
echo "To switch to C++ when available:"
echo "1. Ensure bbpPairings executable is in the system PATH"
echo "2. Update server/utils/enhancedPairingSystem.js to use BBPPairingsCPP"
echo "3. Test with: node test-cpp-integration.js"
echo ""

# Create a simple test script
echo "🧪 Creating test script..."
cat > test-cpp-integration.js << 'EOF'
const { BBPPairingsCPP } = require('./server/utils/bbpPairingsCPP');

async function testCPPIntegration() {
  console.log('🧪 Testing C++ bbpPairings integration...');
  
  try {
    const bbpPairings = new BBPPairingsCPP();
    
    // Test with sample data
    const players = [
      { id: 1, name: 'Player 1', rating: 1500, points: 0 },
      { id: 2, name: 'Player 2', rating: 1600, points: 0 },
      { id: 3, name: 'Player 3', rating: 1400, points: 0 },
      { id: 4, name: 'Player 4', rating: 1700, points: 0 }
    ];
    
    const result = await bbpPairings.generatePairings('test-tournament', 1, players, {
      pairingSystem: 'dutch',
      tournamentName: 'Test Tournament'
    });
    
    if (result.success) {
      console.log('✅ C++ integration successful!');
      console.log('📊 Generated pairings:', result.pairings);
    } else {
      console.log('❌ C++ integration failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ C++ integration error:', error.message);
    console.log('💡 Make sure bbpPairings executable is available');
  }
}

testCPPIntegration();
EOF

echo "✅ Created test script: test-cpp-integration.js"
echo ""

# Create integration instructions
echo "📝 Integration Instructions:"
echo "=========================="
echo ""
echo "1. Choose one of the options above to get bbpPairings executable"
echo "2. Run: node test-cpp-integration.js"
echo "3. If successful, update your pairing system to use C++"
echo ""
echo "To update the pairing system:"
echo "1. Edit server/utils/enhancedPairingSystem.js"
echo "2. Replace BBPPairingsDirect with BBPPairingsCPP"
echo "3. Test with real tournament data"
echo ""
echo "🎯 Next Steps:"
echo "- Try Option 2 (Docker) for the most reliable setup"
echo "- Use Option 4 (JavaScript) if C++ compilation fails"
echo "- The JavaScript implementation provides the same algorithms"
echo ""
echo "📚 For more help:"
echo "- bbpPairings GitHub: https://github.com/BieremaBoyzProgramming/bbpPairings"
echo "- Docker documentation: https://docs.docker.com/"
echo "- Node.js child_process: https://nodejs.org/api/child_process.html"
