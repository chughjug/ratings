// Network diagnostics utility for troubleshooting connectivity issues

interface NetworkDiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

class NetworkDiagnostics {
  private static instance: NetworkDiagnostics;
  
  static getInstance(): NetworkDiagnostics {
    if (!NetworkDiagnostics.instance) {
      NetworkDiagnostics.instance = new NetworkDiagnostics();
    }
    return NetworkDiagnostics.instance;
  }

  async diagnoseConnection(baseUrl: string): Promise<NetworkDiagnosticResult[]> {
    const results: NetworkDiagnosticResult[] = [];
    
    // Test 1: Basic connectivity
    results.push(await this.testBasicConnectivity(baseUrl));
    
    // Test 2: CORS headers
    results.push(await this.testCORSHeaders(baseUrl));
    
    // Test 3: API endpoint availability
    results.push(await this.testAPIEndpoint(baseUrl));
    
    // Test 4: Response time
    results.push(await this.testResponseTime(baseUrl));
    
    return results;
  }

  private async testBasicConnectivity(baseUrl: string): Promise<NetworkDiagnosticResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(baseUrl, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      return {
        success: true,
        message: 'Basic connectivity test passed',
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Basic connectivity test failed',
        details: {
          error: error.message,
          name: error.name,
          code: error.code
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testCORSHeaders(baseUrl: string): Promise<NetworkDiagnosticResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(baseUrl, {
        method: 'OPTIONS',
        signal: controller.signal,
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      clearTimeout(timeoutId);
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
      };
      
      return {
        success: !!corsHeaders['Access-Control-Allow-Origin'],
        message: corsHeaders['Access-Control-Allow-Origin'] 
          ? 'CORS headers present' 
          : 'CORS headers missing or incorrect',
        details: corsHeaders,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'CORS test failed',
        details: {
          error: error.message,
          name: error.name
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testAPIEndpoint(baseUrl: string): Promise<NetworkDiagnosticResult> {
    try {
      const apiUrl = `${baseUrl}/api/tournaments`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      return {
        success: response.ok,
        message: response.ok 
          ? 'API endpoint accessible' 
          : `API endpoint returned ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          url: apiUrl
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'API endpoint test failed',
        details: {
          error: error.message,
          name: error.name,
          code: error.code
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testResponseTime(baseUrl: string): Promise<NetworkDiagnosticResult> {
    try {
      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      await fetch(baseUrl, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      return {
        success: responseTime < 5000, // Success if response time < 5 seconds
        message: `Response time: ${responseTime.toFixed(2)}ms`,
        details: {
          responseTime: responseTime,
          threshold: 5000,
          performance: responseTime < 1000 ? 'excellent' : 
                      responseTime < 3000 ? 'good' : 
                      responseTime < 5000 ? 'fair' : 'poor'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Response time test failed',
        details: {
          error: error.message,
          name: error.name
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Utility method to get network information
  getNetworkInfo(): any {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      connection: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      } : 'Not available',
      location: window.location.href,
      timestamp: new Date().toISOString()
    };
  }

  // Generate a comprehensive network report
  async generateNetworkReport(baseUrl: string): Promise<{
    summary: {
      overall: 'success' | 'warning' | 'error';
      testsPassed: number;
      totalTests: number;
    };
    results: NetworkDiagnosticResult[];
    networkInfo: any;
    recommendations: string[];
  }> {
    const results = await this.diagnoseConnection(baseUrl);
    const networkInfo = this.getNetworkInfo();
    
    const testsPassed = results.filter(r => r.success).length;
    const totalTests = results.length;
    
    let overall: 'success' | 'warning' | 'error';
    if (testsPassed === totalTests) {
      overall = 'success';
    } else if (testsPassed > totalTests / 2) {
      overall = 'warning';
    } else {
      overall = 'error';
    }
    
    const recommendations: string[] = [];
    
    if (overall === 'error') {
      recommendations.push('Check your internet connection');
      recommendations.push('Verify the server is running and accessible');
      recommendations.push('Check firewall and proxy settings');
    }
    
    if (results.some(r => !r.success && r.message.includes('CORS'))) {
      recommendations.push('CORS configuration may need adjustment');
    }
    
    if (results.some(r => r.details?.responseTime && r.details.responseTime > 3000)) {
      recommendations.push('Consider optimizing network performance');
    }
    
    return {
      summary: {
        overall,
        testsPassed,
        totalTests
      },
      results,
      networkInfo,
      recommendations
    };
  }
}

export default NetworkDiagnostics;
