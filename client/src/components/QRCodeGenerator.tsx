import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Download, 
  Copy, 
  Printer, 
  Settings, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { qrCodeApi } from '../services/api';

interface QRCodeGeneratorProps {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface QRCodeOptions {
  size: number;
  color: string;
  format: string;
  title?: string;
}

interface QRCodeResult {
  success: boolean;
  data: {
    qrCode: string;
    url?: string;
    content?: string;
    type: string;
    tournamentId?: string;
    round?: number;
    playerId?: string;
  };
  validation?: any;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ tournamentId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pairings' | 'standings' | 'tournament' | 'custom' | 'batch'>('pairings');
  const [loading, setLoading] = useState(false);
  const [qrCodeResult, setQrCodeResult] = useState<QRCodeResult | null>(null);
  const [round, setRound] = useState(1);
  const [playerId, setPlayerId] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [options, setOptions] = useState<QRCodeOptions>({
    size: 256,
    color: 'black',
    format: 'png'
  });
  const [showPreview, setShowPreview] = useState(true);
  const [availableOptions, setAvailableOptions] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  const loadOptions = async () => {
    try {
      const response = await qrCodeApi.getOptions();
      setAvailableOptions(response.data.data);
    } catch (error) {
      console.error('Failed to load QR code options:', error);
    }
  };

  const generateQRCode = async (type: string, data: any) => {
    setLoading(true);
    setQrCodeResult(null);
    setValidation(null);

    try {
      let response;
      
      switch (type) {
        case 'pairings':
          response = await qrCodeApi.generatePairings(tournamentId, data.round, options);
          break;
        case 'standings':
          response = await qrCodeApi.generateStandings(tournamentId, options);
          break;
        case 'tournament':
          response = await qrCodeApi.generateTournament(tournamentId, options);
          break;
        case 'player-checkin':
          response = await qrCodeApi.generatePlayerCheckIn(tournamentId, data.playerId, options);
          break;
        case 'custom':
          response = await qrCodeApi.generateCustom(data.content, options);
          break;
        default:
          throw new Error('Invalid QR code type');
      }

      setQrCodeResult(response.data);
      if (response.data.validation) {
        setValidation(response.data.validation);
      }
    } catch (error: any) {
      console.error('QR code generation failed:', error);
      alert(`Failed to generate QR code: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePairings = () => {
    generateQRCode('pairings', { round });
  };

  const handleGenerateStandings = () => {
    generateQRCode('standings', {});
  };

  const handleGenerateTournament = () => {
    generateQRCode('tournament', {});
  };

  const handleGeneratePlayerCheckIn = () => {
    if (!playerId) {
      alert('Please enter a player ID');
      return;
    }
    generateQRCode('player-checkin', { playerId });
  };

  const handleGenerateCustom = () => {
    if (!customContent) {
      alert('Please enter custom content');
      return;
    }
    generateQRCode('custom', { content: customContent });
  };

  const handleDownload = () => {
    if (!qrCodeResult?.data?.qrCode) return;

    const link = document.createElement('a');
    link.href = qrCodeResult.data.qrCode;
    link.download = `qr-code-${qrCodeResult.data.type}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = () => {
    if (!qrCodeResult?.data?.qrCode) return;

    // Copy the data URL to clipboard
    navigator.clipboard.writeText(qrCodeResult.data.qrCode).then(() => {
      alert('QR code copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy QR code');
    });
  };

  const handlePrint = () => {
    if (!qrCodeResult?.data?.qrCode) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${qrCodeResult.data.type}</title>
            <style>
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                font-family: Arial, sans-serif;
              }
              .qr-container { 
                text-align: center; 
                padding: 20px;
              }
              .qr-code { 
                max-width: 100%; 
                height: auto; 
                border: 1px solid #ccc;
              }
              .qr-title {
                margin-bottom: 20px;
                font-size: 18px;
                font-weight: bold;
              }
              .qr-url {
                margin-top: 20px;
                font-size: 14px;
                color: #666;
                word-break: break-all;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="qr-title">${qrCodeResult.data.type.toUpperCase()} QR Code</div>
              <img src="${qrCodeResult.data.qrCode}" alt="QR Code" class="qr-code" />
              ${qrCodeResult.data.url ? `<div class="qr-url">${qrCodeResult.data.url}</div>` : ''}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleValidateContent = async () => {
    if (!customContent) return;

    try {
      const response = await qrCodeApi.validateContent(customContent);
      setValidation(response.data.data);
    } catch (error: any) {
      console.error('Validation failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <QrCode className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">QR Code Generator</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'pairings', label: 'Pairings', icon: QrCode },
              { id: 'standings', label: 'Standings', icon: QrCode },
              { id: 'tournament', label: 'Tournament', icon: QrCode },
              { id: 'custom', label: 'Custom', icon: Settings },
              { id: 'batch', label: 'Batch', icon: RefreshCw }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex">
          {/* Left Panel - Controls */}
          <div className="w-1/2 p-6 border-r">
            {/* QR Code Type Controls */}
            {activeTab === 'pairings' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Round Pairings QR Code</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Round Number
                  </label>
                  <input
                    type="number"
                    value={round}
                    onChange={(e) => setRound(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleGeneratePairings}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <QrCode className="h-4 w-4" />
                  <span>{loading ? 'Generating...' : 'Generate Pairings QR Code'}</span>
                </button>
              </div>
            )}

            {activeTab === 'standings' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Tournament Standings QR Code</h3>
                
                <button
                  onClick={handleGenerateStandings}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <QrCode className="h-4 w-4" />
                  <span>{loading ? 'Generating...' : 'Generate Standings QR Code'}</span>
                </button>
              </div>
            )}

            {activeTab === 'tournament' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Tournament Info QR Code</h3>
                
                <button
                  onClick={handleGenerateTournament}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <QrCode className="h-4 w-4" />
                  <span>{loading ? 'Generating...' : 'Generate Tournament QR Code'}</span>
                </button>
              </div>
            )}

            {activeTab === 'custom' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Custom QR Code</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    placeholder="Enter content for QR code..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleValidateContent}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Validate Content
                  </button>
                  <button
                    onClick={handleGenerateCustom}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>{loading ? 'Generating...' : 'Generate'}</span>
                  </button>
                </div>

                {validation && (
                  <div className={`p-3 rounded-md ${
                    validation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {validation.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        validation.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {validation.isValid ? 'Valid Content' : 'Invalid Content'}
                      </span>
                    </div>
                    
                    {validation.errors.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                        <ul className="text-sm text-red-700 list-disc list-inside">
                          {validation.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validation.warnings.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                        <ul className="text-sm text-yellow-700 list-disc list-inside">
                          {validation.warnings.map((warning: string, index: number) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validation.suggestions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-blue-800 mb-1">Suggestions:</p>
                        <ul className="text-sm text-blue-700 list-disc list-inside">
                          {validation.suggestions.map((suggestion: string, index: number) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* QR Code Options */}
            <div className="mt-8 pt-6 border-t">
              <h4 className="text-md font-medium text-gray-900 mb-4">QR Code Options</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size
                  </label>
                  <select
                    value={options.size}
                    onChange={(e) => setOptions({...options, size: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableOptions?.sizes?.map((size: any) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <select
                    value={options.color}
                    onChange={(e) => setOptions({...options, color: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableOptions?.colors?.map((color: any) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format
                  </label>
                  <select
                    value={options.format}
                    onChange={(e) => setOptions({...options, format: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableOptions?.formats?.map((format: any) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Preview</h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!loading && qrCodeResult && showPreview && (
              <div className="space-y-4">
                <div className="text-center">
                  <img
                    src={qrCodeResult.data.qrCode}
                    alt="Generated QR Code"
                    className="mx-auto border border-gray-300 rounded-lg"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </div>

                {qrCodeResult.data.url && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600 mb-1">URL:</p>
                    <p className="text-sm font-mono text-gray-800 break-all">{qrCodeResult.data.url}</p>
                  </div>
                )}

                {qrCodeResult.data.content && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600 mb-1">Content:</p>
                    <p className="text-sm font-mono text-gray-800 break-all">{qrCodeResult.data.content}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            )}

            {!loading && !qrCodeResult && (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Generate a QR code to see preview</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
