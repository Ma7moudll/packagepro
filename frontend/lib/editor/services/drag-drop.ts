// Enhanced Drag & Drop Service
// Provides advanced drag & drop functionality with visual feedback

export interface DragItem {
  id: string;
  type: 'text' | 'image' | 'shape' | 'template' | 'asset';
  data: any;
  preview?: string;
  dimensions?: { width: number; height: number };
}

export interface DropZone {
  id: string;
  element: HTMLElement;
  accepts: string[];
  onDrop: (item: DragItem, position: { x: number; y: number }) => void;
  onHover?: (item: DragItem, position: { x: number; y: number }) => void;
  onLeave?: () => void;
}

export interface DragSession {
  item: DragItem;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  isDragging: boolean;
  dropZones: DropZone[];
  ghostElement?: HTMLElement;
}

export class DragDropService {
  private static currentSession: DragSession | null = null;
  private static dropZones: Map<string, DropZone> = new Map();
  private static dragImage: HTMLElement | null = null;
  private static snapToGrid = true;
  private static gridSize = 10;
  private static onDragStart?: (session: DragSession) => void;
  private static onDragEnd?: (session: DragSession, dropped: boolean) => void;

  /**
   * Initialize drag and drop system
   */
  static initialize(): void {
    document.addEventListener('dragover', this.handleGlobalDragOver.bind(this));
    document.addEventListener('drop', this.handleGlobalDrop.bind(this));
    document.addEventListener('dragend', this.handleGlobalDragEnd.bind(this));
  }

  /**
   * Register a drop zone
   */
  static registerDropZone(dropZone: DropZone): void {
    this.dropZones.set(dropZone.id, dropZone);
  }

  /**
   * Unregister a drop zone
   */
  static unregisterDropZone(zoneId: string): void {
    this.dropZones.delete(zoneId);
  }

  /**
   * Start a drag operation
   */
  static startDrag(
    item: DragItem,
    event: DragEvent,
    options?: {
      dragImage?: HTMLElement;
      offset?: { x: number; y: number };
    }
  ): boolean {
    if (this.currentSession) {
      return false; // Already dragging
    }

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const startPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    this.currentSession = {
      item,
      startPosition,
      currentPosition: { ...startPosition },
      isDragging: true,
      dropZones: Array.from(this.dropZones.values()),
      ghostElement: options?.dragImage,
    };

    // Set up drag image
    if (options?.dragImage) {
      event.dataTransfer?.setDragImage(options.dragImage, 0, 0);
    }

    // Set drag data
    event.dataTransfer!.setData('application/json', JSON.stringify(item));
    event.dataTransfer!.effectAllowed = 'copy';

    this.onDragStart?.(this.currentSession);
    return true;
  }

  /**
   * Handle global drag over
   */
  private static handleGlobalDragOver(event: DragEvent): void {
    event.preventDefault();

    if (!this.currentSession) return;

    // Update current position
    this.currentSession.currentPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    // Check drop zones
    let hoveredZone: DropZone | null = null;

    for (const zone of this.currentSession.dropZones) {
      const rect = zone.element.getBoundingClientRect();

      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        hoveredZone = zone;
        break;
      }
    }

    if (hoveredZone) {
      const relativePosition = {
        x: event.clientX - hoveredZone.element.getBoundingClientRect().left,
        y: event.clientY - hoveredZone.element.getBoundingClientRect().top,
      };

      // Snap to grid if enabled
      if (this.snapToGrid) {
        relativePosition.x = Math.round(relativePosition.x / this.gridSize) * this.gridSize;
        relativePosition.y = Math.round(relativePosition.y / this.gridSize) * this.gridSize;
      }

      hoveredZone.onHover?.(this.currentSession.item, relativePosition);
      event.dataTransfer!.dropEffect = 'copy';
    } else {
      // Clear hover states
      this.currentSession.dropZones.forEach(zone => {
        zone.onLeave?.();
      });
      event.dataTransfer!.dropEffect = 'none';
    }
  }

  /**
   * Handle global drop
   */
  private static handleGlobalDrop(event: DragEvent): void {
    event.preventDefault();

    if (!this.currentSession) return;

    // Find drop zone
    for (const zone of this.currentSession.dropZones) {
      const rect = zone.element.getBoundingClientRect();

      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        if (zone.accepts.includes(this.currentSession.item.type)) {
          const relativePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };

          // Snap to grid if enabled
          if (this.snapToGrid) {
            relativePosition.x = Math.round(relativePosition.x / this.gridSize) * this.gridSize;
            relativePosition.y = Math.round(relativePosition.y / this.gridSize) * this.gridSize;
          }

          zone.onDrop(this.currentSession.item, relativePosition);
          this.onDragEnd?.(this.currentSession, true);
          this.currentSession = null;
          return;
        }
      }
    }

    // No valid drop zone found
    this.onDragEnd?.(this.currentSession, false);
    this.currentSession = null;
  }

  /**
   * Handle global drag end
   */
  private static handleGlobalDragEnd(event: DragEvent): void {
    if (this.currentSession) {
      // Clear hover states
      this.currentSession.dropZones.forEach(zone => {
        zone.onLeave?.();
      });

      this.onDragEnd?.(this.currentSession, false);
      this.currentSession = null;
    }
  }

  /**
   * Create drag preview element
   */
  static createDragPreview(item: DragItem): HTMLElement {
    const preview = document.createElement('div');
    preview.className = 'drag-preview fixed pointer-events-none z-50 opacity-80';
    preview.style.transform = 'rotate(5deg)';

    if (item.preview) {
      const img = document.createElement('img');
      img.src = item.preview;
      img.style.maxWidth = '100px';
      img.style.maxHeight = '100px';
      img.style.borderRadius = '4px';
      img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      preview.appendChild(img);
    } else {
      // Default preview
      preview.innerHTML = `
        <div style="
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-size: 12px;
          color: #374151;
        ">
          ${item.type === 'text' ? '📝' : item.type === 'image' ? '🖼️' : '⬜'}
          ${item.type}
        </div>
      `;
    }

    document.body.appendChild(preview);
    return preview;
  }

  /**
   * Update drag preview position
   */
  static updateDragPreview(preview: HTMLElement, x: number, y: number): void {
    preview.style.left = `${x}px`;
    preview.style.top = `${y}px`;
  }

  /**
   * Remove drag preview
   */
  static removeDragPreview(preview: HTMLElement): void {
    if (preview.parentNode) {
      preview.parentNode.removeChild(preview);
    }
  }

  /**
   * Set grid snapping
   */
  static setGridSnapping(enabled: boolean, size?: number): void {
    this.snapToGrid = enabled;
    if (size) {
      this.gridSize = size;
    }
  }

  /**
   * Get current drag session
   */
  static getCurrentSession(): DragSession | null {
    return this.currentSession;
  }

  /**
   * Check if currently dragging
   */
  static isDragging(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Set event handlers
   */
  static on(event: 'dragStart' | 'dragEnd', handler: any): void {
    switch (event) {
      case 'dragStart':
        this.onDragStart = handler;
        break;
      case 'dragEnd':
        this.onDragEnd = handler;
        break;
    }
  }

  /**
   * Create draggable element
   */
  static makeDraggable(
    element: HTMLElement,
    item: DragItem,
    options?: {
      onDragStart?: () => void;
      onDragEnd?: (dropped: boolean) => void;
    }
  ): void {
    element.draggable = true;
    element.style.cursor = 'grab';

    element.addEventListener('dragstart', (event) => {
      const preview = this.createDragPreview(item);
      const success = this.startDrag(item, event, { dragImage: preview });

      if (success) {
        element.style.cursor = 'grabbing';
        options?.onDragStart?.();
      }
    });

    element.addEventListener('dragend', (event) => {
      element.style.cursor = 'grab';
      options?.onDragEnd?.(event.dataTransfer?.dropEffect === 'copy');
    });
  }

  /**
   * Create drop zone element
   */
  static makeDropZone(
    element: HTMLElement,
    options: {
      accepts: string[];
      onDrop: (item: DragItem, position: { x: number; y: number }) => void;
      onHover?: (item: DragItem, position: { x: number; y: number }) => void;
      onLeave?: () => void;
    }
  ): string {
    const zoneId = `dropzone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.registerDropZone({
      id: zoneId,
      element,
      accepts: options.accepts,
      onDrop: options.onDrop,
      onHover: options.onHover,
      onLeave: options.onLeave,
    });

    // Add visual feedback
    element.addEventListener('dragenter', () => {
      element.classList.add('drop-zone-hover');
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('drop-zone-hover');
    });

    element.addEventListener('drop', () => {
      element.classList.remove('drop-zone-hover');
    });

    return zoneId;
  }

  /**
   * Clean up drop zone
   */
  static cleanupDropZone(zoneId: string): void {
    this.unregisterDropZone(zoneId);
  }
}