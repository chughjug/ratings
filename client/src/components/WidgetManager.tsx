import React, { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Move, 
  Eye, 
  Settings, 
  Type, 
  Image, 
  Video, 
  MapPin, 
  Clock, 
  BarChart3, 
  MessageSquare,
  Save,
  X
} from 'lucide-react';

interface WidgetManagerProps {
  widgets: CustomWidget[];
  onUpdateWidgets: (widgets: CustomWidget[]) => void;
}

interface CustomWidget {
  id: string;
  type: 'text' | 'image' | 'video' | 'map' | 'countdown' | 'stats' | 'testimonial';
  title: string;
  content: string;
  position: 'header' | 'sidebar' | 'footer' | 'content';
  order: number;
  settings: any;
}

const WidgetManager: React.FC<WidgetManagerProps> = ({
  widgets,
  onUpdateWidgets
}) => {
  const [editingWidget, setEditingWidget] = useState<CustomWidget | null>(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [newWidget, setNewWidget] = useState<Partial<CustomWidget>>({
    type: 'text',
    title: '',
    content: '',
    position: 'content',
    order: widgets.length,
    settings: {}
  });

  const widgetTypes = [
    { type: 'text', label: 'Text Widget', icon: Type, description: 'Add custom text content' },
    { type: 'image', label: 'Image Widget', icon: Image, description: 'Display images or galleries' },
    { type: 'video', label: 'Video Widget', icon: Video, description: 'Embed videos from YouTube/Vimeo' },
    { type: 'map', label: 'Map Widget', icon: MapPin, description: 'Show location with Google Maps' },
    { type: 'countdown', label: 'Countdown Widget', icon: Clock, description: 'Countdown timer for events' },
    { type: 'stats', label: 'Stats Widget', icon: BarChart3, description: 'Display statistics and metrics' },
    { type: 'testimonial', label: 'Testimonial Widget', icon: MessageSquare, description: 'Show testimonials and reviews' }
  ];

  const handleAddWidget = () => {
    if (newWidget.title && newWidget.content) {
      const widget: CustomWidget = {
        id: Date.now().toString(),
        type: newWidget.type as any,
        title: newWidget.title,
        content: newWidget.content,
        position: newWidget.position as any,
        order: newWidget.order || widgets.length,
        settings: newWidget.settings || {}
      };
      
      onUpdateWidgets([...widgets, widget]);
      setNewWidget({
        type: 'text',
        title: '',
        content: '',
        position: 'content',
        order: widgets.length + 1,
        settings: {}
      });
      setShowAddWidget(false);
    }
  };

  const handleUpdateWidget = (updatedWidget: CustomWidget) => {
    const updatedWidgets = widgets.map(widget => 
      widget.id === updatedWidget.id ? updatedWidget : widget
    );
    onUpdateWidgets(updatedWidgets);
    setEditingWidget(null);
  };

  const handleDeleteWidget = (widgetId: string) => {
    onUpdateWidgets(widgets.filter(widget => widget.id !== widgetId));
  };

  const handleMoveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const widgetIndex = widgets.findIndex(w => w.id === widgetId);
    if (
      (direction === 'up' && widgetIndex > 0) ||
      (direction === 'down' && widgetIndex < widgets.length - 1)
    ) {
      const newWidgets = [...widgets];
      const targetIndex = direction === 'up' ? widgetIndex - 1 : widgetIndex + 1;
      [newWidgets[widgetIndex], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[widgetIndex]];
      onUpdateWidgets(newWidgets);
    }
  };

  const getWidgetIcon = (type: string) => {
    const widgetType = widgetTypes.find(wt => wt.type === type);
    return widgetType ? widgetType.icon : Type;
  };

  const renderWidgetSettings = (widget: CustomWidget) => {
    switch (widget.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Content
              </label>
              <textarea
                value={widget.content}
                onChange={(e) => setEditingWidget({
                  ...widget,
                  content: e.target.value
                })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Size
              </label>
              <select
                value={widget.settings.fontSize || 'medium'}
                onChange={(e) => setEditingWidget({
                  ...widget,
                  settings: { ...widget.settings, fontSize: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra Large</option>
              </select>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={widget.content}
                onChange={(e) => setEditingWidget({
                  ...widget,
                  content: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alt Text
              </label>
              <input
                type="text"
                value={widget.settings.altText || ''}
                onChange={(e) => setEditingWidget({
                  ...widget,
                  settings: { ...widget.settings, altText: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'countdown':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Date & Time
              </label>
              <input
                type="datetime-local"
                value={widget.content}
                onChange={(e) => setEditingWidget({
                  ...widget,
                  content: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Countdown Format
              </label>
              <select
                value={widget.settings.format || 'full'}
                onChange={(e) => setEditingWidget({
                  ...widget,
                  settings: { ...widget.settings, format: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="full">Days, Hours, Minutes, Seconds</option>
                <option value="days">Days Only</option>
                <option value="hours">Hours and Minutes</option>
                <option value="minutes">Minutes and Seconds</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              value={widget.content}
              onChange={(e) => setEditingWidget({
                ...widget,
                content: e.target.value
              })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Custom Widgets</h3>
        <button
          onClick={() => setShowAddWidget(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2 inline" />
          Add Widget
        </button>
      </div>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">Add New Widget</h4>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Widget Type
                </label>
                <select
                  value={newWidget.type}
                  onChange={(e) => setNewWidget({
                    ...newWidget,
                    type: e.target.value as any
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {widgetTypes.map(type => (
                    <option key={type.type} value={type.type}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Widget Title
                </label>
                <input
                  type="text"
                  value={newWidget.title}
                  onChange={(e) => setNewWidget({
                    ...newWidget,
                    title: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  value={newWidget.position}
                  onChange={(e) => setNewWidget({
                    ...newWidget,
                    position: e.target.value as any
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="header">Header</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="content">Content Area</option>
                  <option value="footer">Footer</option>
                </select>
              </div>

              {renderWidgetSettings(newWidget as CustomWidget)}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddWidget(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWidget}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Widget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Widget Modal */}
      {editingWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">Edit Widget</h4>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Widget Title
                </label>
                <input
                  type="text"
                  value={editingWidget.title}
                  onChange={(e) => setEditingWidget({
                    ...editingWidget,
                    title: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  value={editingWidget.position}
                  onChange={(e) => setEditingWidget({
                    ...editingWidget,
                    position: e.target.value as any
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="header">Header</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="content">Content Area</option>
                  <option value="footer">Footer</option>
                </select>
              </div>

              {renderWidgetSettings(editingWidget)}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setEditingWidget(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateWidget(editingWidget)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2 inline" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget List */}
      <div className="space-y-3">
        {widgets.length > 0 ? (
          widgets
            .sort((a, b) => a.order - b.order)
            .map((widget) => {
              const Icon = getWidgetIcon(widget.type);
              return (
                <div key={widget.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-gray-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">{widget.title}</h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {widget.type} widget • {widget.position}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleMoveWidget(widget.id, 'up')}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={widget.order === 0}
                      >
                        <Move className="h-4 w-4 rotate-90" />
                      </button>
                      <button
                        onClick={() => handleMoveWidget(widget.id, 'down')}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={widget.order === widgets.length - 1}
                      >
                        <Move className="h-4 w-4 -rotate-90" />
                      </button>
                      <button
                        onClick={() => setEditingWidget(widget)}
                        className="p-2 text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWidget(widget.id)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
        ) : (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No widgets added yet</p>
            <p className="text-sm text-gray-500">Add custom widgets to enhance your organization page</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetManager;
