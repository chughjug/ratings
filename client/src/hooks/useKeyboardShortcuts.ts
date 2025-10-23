import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts?: KeyboardShortcut[];
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions = {}) => {
  const { enabled = true, shortcuts = [] } = options;
  const navigate = useNavigate();

  // Default shortcuts
  const defaultShortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      ctrlKey: true,
      action: () => navigate('/'),
      description: 'Go to Dashboard'
    },
    {
      key: 't',
      ctrlKey: true,
      action: () => navigate('/tournaments'),
      description: 'Go to Tournaments'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => navigate('/tournaments/new'),
      description: 'Create New Tournament'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        // Save current form or data
        const saveButton = document.querySelector('[data-save-action]') as HTMLButtonElement;
        if (saveButton) {
          saveButton.click();
        }
      },
      description: 'Save Current Data'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => {
        // Export current data
        const exportButton = document.querySelector('[data-export-action]') as HTMLButtonElement;
        if (exportButton) {
          exportButton.click();
        }
      },
      description: 'Export Data'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => {
        // Focus search input
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Focus Search'
    },
    {
      key: '?',
      action: () => {
        // Show keyboard shortcuts help
        const helpModal = document.querySelector('[data-help-modal]') as HTMLElement;
        if (helpModal) {
          helpModal.classList.remove('hidden');
        }
      },
      description: 'Show Keyboard Shortcuts'
    },
    {
      key: 'Escape',
      action: () => {
        // Close modals or cancel actions
        const modals = document.querySelectorAll('[data-modal]');
        modals.forEach(modal => {
          if (!modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
          }
        });
      },
      description: 'Close Modals'
    }
  ];

  const allShortcuts = [...defaultShortcuts, ...shortcuts];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }

    const pressedShortcut = allShortcuts.find(shortcut => {
      return shortcut.key === event.key &&
             !!shortcut.ctrlKey === event.ctrlKey &&
             !!shortcut.shiftKey === event.shiftKey &&
             !!shortcut.altKey === event.altKey;
    });

    if (pressedShortcut) {
      event.preventDefault();
      pressedShortcut.action();
    }
  }, [enabled, allShortcuts]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: allShortcuts,
    isEnabled: enabled
  };
};

// Hook for specific page shortcuts
export const usePageShortcuts = (pageShortcuts: KeyboardShortcut[]) => {
  return useKeyboardShortcuts({ shortcuts: pageShortcuts });
};

// Hook for tournament-specific shortcuts
export const useTournamentShortcuts = (tournamentId: string) => {
  const navigate = useNavigate();
  
  const tournamentShortcuts: KeyboardShortcut[] = [
    {
      key: 'p',
      ctrlKey: true,
      action: () => {
        // Go to players tab
        const playersTab = document.querySelector('[data-tab="players"]') as HTMLElement;
        if (playersTab) {
          playersTab.click();
        }
      },
      description: 'Go to Players Tab'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => {
        // Go to pairings tab
        const pairingsTab = document.querySelector('[data-tab="pairings"]') as HTMLElement;
        if (pairingsTab) {
          pairingsTab.click();
        }
      },
      description: 'Go to Pairings Tab'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        // Go to standings tab
        const standingsTab = document.querySelector('[data-tab="standings"]') as HTMLElement;
        if (standingsTab) {
          standingsTab.click();
        }
      },
      description: 'Go to Standings Tab'
    },
    {
      key: 'g',
      ctrlKey: true,
      action: () => {
        // Generate pairings
        const generateButton = document.querySelector('[data-generate-pairings]') as HTMLButtonElement;
        if (generateButton) {
          generateButton.click();
        }
      },
      description: 'Generate Pairings'
    },
    {
      key: 'Enter',
      action: () => {
        // Submit current form
        const submitButton = document.querySelector('[data-submit-form]') as HTMLButtonElement;
        if (submitButton) {
          submitButton.click();
        }
      },
      description: 'Submit Form'
    }
  ];

  return useKeyboardShortcuts({ shortcuts: tournamentShortcuts });
};
