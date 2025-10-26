#!/bin/bash

# bbpPairings C++ Setup Script
# This script helps set up the C++ bbpPairings executable

echo "🔧 Setting up bbpPairings C++ executable..."

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detected macOS"
    
    # Check if Homebrew is installed
    if command -v brew &> /dev/null; then
        echo "📦 Installing dependencies via Homebrew..."
        brew install gcc make
    else
        echo "⚠️  Homebrew not found. Please install it first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
fi

# Check if we're on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux"
    
    # Update package list and install build tools
    if command -v apt-get &> /dev/null; then
        echo "📦 Installing dependencies via apt..."
        sudo apt-get update
        sudo apt-get install -y build-essential g++ make
    elif command -v yum &> /dev/null; then
        echo "📦 Installing dependencies via yum..."
        sudo yum groupinstall -y "Development Tools"
        sudo yum install -y gcc-c++ make
    else
        echo "⚠️  Package manager not found. Please install build tools manually."
        exit 1
    fi
fi

# Navigate to bbpPairings directory
cd "$(dirname "$0")/bbpPairings-master"

echo "🔨 Compiling bbpPairings..."

# Try to compile with simplified flags
if make clean && make CXXFLAGS="-std=c++17 -O2 -Wall" 2>/dev/null; then
    echo "✅ Compilation successful!"
    
    # Check if executable was created
    if [ -f "bbpPairings" ]; then
        echo "✅ bbpPairings executable created successfully!"
        echo "📍 Location: $(pwd)/bbpPairings"
        
        # Make it executable
        chmod +x bbpPairings
        
        # Test it
        echo "🧪 Testing executable..."
        if ./bbpPairings --help 2>/dev/null; then
            echo "✅ Executable works correctly!"
        else
            echo "⚠️  Executable created but may have issues"
        fi
        
    else
        echo "❌ Compilation failed - no executable created"
        exit 1
    fi
    
else
    echo "❌ Compilation failed with standard flags"
    echo "🔧 Trying alternative compilation..."
    
    # Try with even simpler flags
    if g++ -o bbpPairings src/main.cpp src/matching/computer.cpp src/matching/detail/graph.cpp src/matching/detail/parentblossom.cpp src/matching/detail/rootblossom.cpp src/swisssystems/common.cpp src/swisssystems/dutch.cpp src/swisssystems/burstein.cpp src/tournament/tournament.cpp src/tournament/generator.cpp src/tournament/checker.cpp src/fileformats/trf.cpp src/fileformats/generatorconfiguration.cpp -Isrc -std=c++17 -O2 2>/dev/null; then
        echo "✅ Alternative compilation successful!"
        chmod +x bbpPairings
    else
        echo "❌ All compilation attempts failed"
        echo ""
        echo "🔍 Troubleshooting steps:"
        echo "1. Make sure you have a C++ compiler installed"
        echo "2. Check that all source files exist"
        echo "3. Try installing Xcode Command Line Tools (macOS):"
        echo "   xcode-select --install"
        echo "4. Try installing build-essential (Linux):"
        echo "   sudo apt-get install build-essential"
        echo ""
        echo "📚 For more help, see the bbpPairings documentation:"
        echo "   https://github.com/BieremaBoyzProgramming/bbpPairings"
        exit 1
    fi
fi

echo ""
echo "🎉 Setup complete!"
echo "📍 bbpPairings executable: $(pwd)/bbpPairings"
echo ""
echo "🧪 Test the executable:"
echo "   ./bbpPairings --help"
echo ""
echo "📝 Next steps:"
echo "1. The Node.js interface will automatically find this executable"
echo "2. You can now use C++ pairing logic in your application"
echo "3. See server/utils/bbpPairingsCPP.js for the interface"
