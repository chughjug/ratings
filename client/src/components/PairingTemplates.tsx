import React, { useState, useCallback } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Save, 
  Play, 
  Settings,
  Star,
  Clock,
  Users,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';
import { Pairing, Player } from '../types';

interface PairingTemplate {
  id: string;
  name: string;
  description: string;
  category: 'swiss' | 'round-robin' | 'elimination' | 'custom';
  icon: React.ReactNode;
  isDefault: boolean;
  isCustom: boolean;
  config: {
    pairingMethod: 'swiss' | 'round-robin' | 'elimination' | 'manual';
    colorBalance: boolean;
    ratingBalance: boolean;
    avoidRepeats: boolean;
    byeHandling: 'top' | 'bottom' | 'random';
    boardOrdering: 'rating' | 'random' | 'sequential';
    customRules?: string[];
  };
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

interface PairingTemplatesProps {
  pairings: Pairing[];
  players: Player[];
  onPairingsUpdate: (pairings: Pairing[]) => void;
  onApplyTemplate: (template: PairingTemplate) => Promise<void>;
  tournamentId: string;
  round: number;
  section: string;
}

const PairingTemplates: React.FC<PairingTemplatesProps> = ({
  pairings,
  players,
  onPairingsUpdate,
  onApplyTemplate,
  tournamentId,
  round,
  section
}) => {
  const [templates, setTemplates] = useState<PairingTemplate[]>([
    {
      id: 'swiss-standard',
      name: 'Swiss Standard',
      description: 'Standard Swiss system pairing with rating balance',
      category: 'swiss',
      icon: <BarChart3 className="h-5 w-5" />,
      isDefault: true,
      isCustom: false,
      config: {
        pairingMethod: 'swiss',
        colorBalance: true,
        ratingBalance: true,
        avoidRepeats: true,
        byeHandling: 'bottom',
        boardOrdering: 'rating',
        customRules: ['Avoid repeat pairings', 'Balance colors', 'Minimize rating differences']
      },
      createdAt: new Date(),
      useCount: 0
    },
    {
      id: 'swiss-quick',
      name: 'Swiss Quick',
      description: 'Fast Swiss pairing without complex balancing',
      category: 'swiss',
      icon: <Zap className="h-5 w-5" />,
      isDefault: true,
      isCustom: false,
      config: {
        pairingMethod: 'swiss',
        colorBalance: false,
        ratingBalance: true,
        avoidRepeats: false,
        byeHandling: 'random',
        boardOrdering: 'sequential',
        customRules: ['Quick generation', 'Basic rating balance']
      },
      createdAt: new Date(),
      useCount: 0
    },
    {
      id: 'round-robin',
      name: 'Round Robin',
      description: 'Round robin pairing for small tournaments',
      category: 'round-robin',
      icon: <Users className="h-5 w-5" />,
      isDefault: true,
      isCustom: false,
      config: {
        pairingMethod: 'round-robin',
        colorBalance: true,
        ratingBalance: false,
        avoidRepeats: true,
        byeHandling: 'top',
        boardOrdering: 'sequential',
        customRules: ['Everyone plays everyone', 'Equal color distribution']
      },
      createdAt: new Date(),
      useCount: 0
    },
    {
      id: 'elimination',
      name: 'Elimination',
      description: 'Single elimination tournament pairing',
      category: 'elimination',
      icon: <Target className="h-5 w-5" />,
      isDefault: true,
      isCustom: false,
      config: {
        pairingMethod: 'elimination',
        colorBalance: false,
        ratingBalance: true,
        avoidRepeats: true,
        byeHandling: 'top',
        boardOrdering: 'rating',
        customRules: ['Higher rated vs lower rated', 'Elimination format']
      },
      createdAt: new Date(),
      useCount: 0
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PairingTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Templates', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'swiss', name: 'Swiss System', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'round-robin', name: 'Round Robin', icon: <Users className="h-4 w-4" /> },
    { id: 'elimination', name: 'Elimination', icon: <Target className="h-4 w-4" /> },
    { id: 'custom', name: 'Custom', icon: <Settings className="h-4 w-4" /> }
  ];

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const handleApplyTemplate = useCallback(async (template: PairingTemplate) => {
    try {
      await onApplyTemplate(template);
      
      // Update use count
      setTemplates(prev => prev.map(t => 
        t.id === template.id 
          ? { ...t, useCount: t.useCount + 1, lastUsed: new Date() }
          : t
      ));
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  }, [onApplyTemplate]);

  const handleCreateTemplate = useCallback((templateData: Omit<PairingTemplate, 'id' | 'createdAt' | 'useCount'>) => {
    const newTemplate: PairingTemplate = {
      ...templateData,
      id: `template_${Date.now()}`,
      createdAt: new Date(),
      useCount: 0
    };
    
    setTemplates(prev => [...prev, newTemplate]);
    setShowCreateModal(false);
  }, []);

  const handleEditTemplate = useCallback((template: PairingTemplate) => {
    setEditingTemplate(template);
  }, []);

  const handleUpdateTemplate = useCallback((updatedTemplate: PairingTemplate) => {
    setTemplates(prev => prev.map(t => 
      t.id === updatedTemplate.id ? updatedTemplate : t
    ));
    setEditingTemplate(null);
  }, []);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  }, []);

  const handleDuplicateTemplate = useCallback((template: PairingTemplate) => {
    const duplicatedTemplate: PairingTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (Copy)`,
      isCustom: true,
      createdAt: new Date(),
      useCount: 0
    };
    
    setTemplates(prev => [...prev, duplicatedTemplate]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pairing Templates</h3>
          <p className="text-sm text-gray-500">Quick pairing generation using predefined templates</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Template</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex space-x-2 overflow-x-auto">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.icon}
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    {template.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {template.name}
                    </h4>
                    {template.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {template.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEditTemplate(template)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit template"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDuplicateTemplate(template)}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="Duplicate template"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {template.isCustom && (
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Template Stats */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <div className="flex items-center space-x-4">
                <span>Used {template.useCount} times</span>
                {template.lastUsed && (
                  <span>Last used {template.lastUsed.toLocaleDateString()}</span>
                )}
              </div>
              <span className="px-2 py-1 bg-gray-100 rounded-full">
                {template.category}
              </span>
            </div>

            {/* Template Config */}
            <div className="space-y-2 mb-4">
              <div className="text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Color Balance:</span>
                  <span className={template.config.colorBalance ? 'text-green-600' : 'text-gray-400'}>
                    {template.config.colorBalance ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rating Balance:</span>
                  <span className={template.config.ratingBalance ? 'text-green-600' : 'text-gray-400'}>
                    {template.config.ratingBalance ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Avoid Repeats:</span>
                  <span className={template.config.avoidRepeats ? 'text-green-600' : 'text-gray-400'}>
                    {template.config.avoidRepeats ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => handleApplyTemplate(template)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <Play className="h-4 w-4" />
              <span>Apply Template</span>
            </button>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => {
              const swissTemplate = templates.find(t => t.id === 'swiss-standard');
              if (swissTemplate) handleApplyTemplate(swissTemplate);
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Swiss</span>
          </button>
          
          <button
            onClick={() => {
              const quickTemplate = templates.find(t => t.id === 'swiss-quick');
              if (quickTemplate) handleApplyTemplate(quickTemplate);
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
          >
            <Zap className="h-4 w-4" />
            <span>Quick</span>
          </button>
          
          <button
            onClick={() => {
              const roundRobinTemplate = templates.find(t => t.id === 'round-robin');
              if (roundRobinTemplate) handleApplyTemplate(roundRobinTemplate);
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
          >
            <Users className="h-4 w-4" />
            <span>Round Robin</span>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Custom</span>
          </button>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTemplate}
        />
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onUpdate={handleUpdateTemplate}
        />
      )}
    </div>
  );
};

// Create Template Modal Component
const CreateTemplateModal: React.FC<{
  onClose: () => void;
  onCreate: (template: Omit<PairingTemplate, 'id' | 'createdAt' | 'useCount'>) => void;
}> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'swiss' as const,
    icon: <Users className="h-5 w-5" />,
    isDefault: false,
    isCustom: true,
    config: {
      pairingMethod: 'swiss' as const,
      colorBalance: true,
      ratingBalance: true,
      avoidRepeats: true,
      byeHandling: 'bottom' as const,
      boardOrdering: 'rating' as const,
      customRules: [] as string[]
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Template</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="swiss">Swiss System</option>
              <option value="round-robin">Round Robin</option>
              <option value="elimination">Elimination</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Template Modal Component
const EditTemplateModal: React.FC<{
  template: PairingTemplate;
  onClose: () => void;
  onUpdate: (template: PairingTemplate) => void;
}> = ({ template, onClose, onUpdate }) => {
  const [formData, setFormData] = useState(template);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Template</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Configuration</h4>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Color Balance</span>
              <input
                type="checkbox"
                checked={formData.config.colorBalance}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, colorBalance: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rating Balance</span>
              <input
                type="checkbox"
                checked={formData.config.ratingBalance}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, ratingBalance: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avoid Repeats</span>
              <input
                type="checkbox"
                checked={formData.config.avoidRepeats}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, avoidRepeats: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Update
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PairingTemplates;

