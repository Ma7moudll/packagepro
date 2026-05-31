// Tutorial Service for new users
// Provides guided tours and helpful tips

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right';
  content: string;
  action?: string;
  nextStep?: string;
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  steps: TutorialStep[];
  targetAudience: 'beginner' | 'intermediate' | 'advanced';
}

export class TutorialService {
  private static readonly TUTORIALS: Tutorial[] = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      description: 'Learn the basics of the design editor',
      targetAudience: 'beginner',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to PackagePro!',
          description: 'Let\'s take a quick tour of the editor',
          position: 'bottom',
          content: 'This editor helps you design custom packaging for your products. Let\'s learn how to use it!',
          nextStep: 'canvas-intro'
        },
        {
          id: 'canvas-intro',
          title: 'The Design Canvas',
          description: 'This is where you create your designs',
          target: '.canvas-container',
          position: 'right',
          content: 'The canvas shows your 3D packaging design. You can switch between 2D and 3D views using the tabs below.',
          nextStep: 'add-elements'
        },
        {
          id: 'add-elements',
          title: 'Adding Elements',
          description: 'Add text, images, and shapes to your design',
          target: '[data-tutorial="left-sidebar"]',
          position: 'right',
          content: 'Use the left sidebar to add text, images, and shapes to your design. Try adding a text element!',
          action: 'add-text',
          nextStep: 'properties'
        },
        {
          id: 'properties',
          title: 'Element Properties',
          description: 'Customize your elements',
          target: '[data-tutorial="right-sidebar"]',
          position: 'left',
          content: 'The right sidebar shows properties for selected elements. Change colors, sizes, and positions here.',
          nextStep: 'export'
        },
        {
          id: 'export',
          title: 'Export Your Design',
          description: 'Save or export your finished design',
          target: '[data-tutorial="export-tab"]',
          position: 'left',
          content: 'When you\'re done, use the Export tab to download your design or save it for production.',
          nextStep: 'finish'
        },
        {
          id: 'finish',
          title: 'You\'re All Set!',
          description: 'Start creating amazing packaging designs',
          position: 'bottom',
          content: 'Now you know the basics! Explore the different tools and create your first custom packaging design.',
        }
      ]
    },
    {
      id: 'advanced-features',
      name: 'Advanced Features',
      description: 'Learn about 3D design and professional tools',
      targetAudience: 'intermediate',
      steps: [
        {
          id: '3d-design',
          title: '3D Design View',
          description: 'Switch to 3D to see your design in real packaging',
          target: '[data-tutorial="view-mode"]',
          position: 'top',
          content: 'The 3D view shows how your design will look on actual packaging. Use it to visualize the final product.',
          nextStep: 'layers'
        },
        {
          id: 'layers',
          title: 'Working with Layers',
          description: 'Organize your design elements',
          target: '[data-tutorial="layers-tab"]',
          position: 'left',
          content: 'Layers help you organize design elements. You can reorder, group, and hide layers for better control.',
          nextStep: 'validation'
        },
        {
          id: 'validation',
          title: 'Print Validation',
          description: 'Ensure your design is print-ready',
          target: '[data-tutorial="validation-tab"]',
          position: 'left',
          content: 'The validation tool checks your design for print requirements like DPI, colors, and bleed areas.',
        }
      ]
    }
  ];

  private static currentTutorial: Tutorial | null = null;
  private static currentStepIndex = 0;
  private static isActive = false;
  private static onStepChange?: (step: TutorialStep | null) => void;

  /**
   * Start a tutorial
   */
  static startTutorial(tutorialId: string): boolean {
    const tutorial = this.TUTORIALS.find(t => t.id === tutorialId);
    if (!tutorial) return false;

    this.currentTutorial = tutorial;
    this.currentStepIndex = 0;
    this.isActive = true;

    this.notifyStepChange();
    return true;
  }

  /**
   * Go to next step
   */
  static nextStep(): boolean {
    if (!this.currentTutorial) return false;

    if (this.currentStepIndex < this.currentTutorial.steps.length - 1) {
      this.currentStepIndex++;
      this.notifyStepChange();
      return true;
    } else {
      this.endTutorial();
      return false;
    }
  }

  /**
   * Go to previous step
   */
  static previousStep(): boolean {
    if (!this.currentTutorial || this.currentStepIndex === 0) return false;

    this.currentStepIndex--;
    this.notifyStepChange();
    return true;
  }

  /**
   * Skip to specific step
   */
  static goToStep(stepId: string): boolean {
    if (!this.currentTutorial) return false;

    const stepIndex = this.currentTutorial.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return false;

    this.currentStepIndex = stepIndex;
    this.notifyStepChange();
    return true;
  }

  /**
   * End tutorial
   */
  static endTutorial(): void {
    this.currentTutorial = null;
    this.currentStepIndex = 0;
    this.isActive = false;
    this.notifyStepChange();
  }

  /**
   * Get current step
   */
  static getCurrentStep(): TutorialStep | null {
    if (!this.isActive || !this.currentTutorial) return null;
    return this.currentTutorial.steps[this.currentStepIndex] || null;
  }

  /**
   * Get tutorial progress
   */
  static getProgress(): { current: number; total: number; percentage: number } {
    if (!this.currentTutorial) return { current: 0, total: 0, percentage: 0 };

    return {
      current: this.currentStepIndex + 1,
      total: this.currentTutorial.steps.length,
      percentage: ((this.currentStepIndex + 1) / this.currentTutorial.steps.length) * 100
    };
  }

  /**
   * Check if tutorial is active
   */
  static isTutorialActive(): boolean {
    return this.isActive;
  }

  /**
   * Get all available tutorials
   */
  static getTutorials(): Tutorial[] {
    return this.TUTORIALS;
  }

  /**
   * Get tutorials for specific audience
   */
  static getTutorialsForAudience(audience: 'beginner' | 'intermediate' | 'advanced'): Tutorial[] {
    return this.TUTORIALS.filter(t => t.targetAudience === audience);
  }

  /**
   * Set step change callback
   */
  static onTutorialStepChange(callback: (step: TutorialStep | null) => void): void {
    this.onStepChange = callback;
  }

  /**
   * Check if user should see tutorial
   */
  static shouldShowTutorial(userType: 'new' | 'returning' | 'experienced'): boolean {
    // Logic to determine if tutorial should be shown
    switch (userType) {
      case 'new':
        return true;
      case 'returning':
        return !this.hasCompletedTutorial('getting-started');
      case 'experienced':
        return false;
      default:
        return false;
    }
  }

  /**
   * Mark tutorial as completed
   */
  static markTutorialCompleted(tutorialId: string): void {
    const completed = this.getCompletedTutorials();
    completed.push(tutorialId);
    localStorage.setItem('completed-tutorials', JSON.stringify(completed));
  }

  /**
   * Check if tutorial is completed
   */
  static hasCompletedTutorial(tutorialId: string): boolean {
    return this.getCompletedTutorials().includes(tutorialId);
  }

  /**
   * Get completed tutorials
   */
  private static getCompletedTutorials(): string[] {
    try {
      const completed = localStorage.getItem('completed-tutorials');
      return completed ? JSON.parse(completed) : [];
    } catch {
      return [];
    }
  }

  /**
   * Notify step change
   */
  private static notifyStepChange(): void {
    const currentStep = this.getCurrentStep();
    this.onStepChange?.(currentStep);
  }

  /**
   * Handle tutorial actions
   */
  static handleAction(action: string): void {
    switch (action) {
      case 'add-text':
        // Trigger add text action
        console.log('Tutorial: Add text action triggered');
        break;
      case 'add-image':
        // Trigger add image action
        console.log('Tutorial: Add image action triggered');
        break;
      default:
        console.log('Tutorial: Unknown action', action);
    }
  }
}