import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 py-8">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
              <p className="text-gray-700 mb-2">
                <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-blue-600">Error Details</summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto text-xs">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


