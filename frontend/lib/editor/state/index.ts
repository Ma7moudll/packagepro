/**
 * Editor State Exports
 * Re-exports types and store for convenient importing
 */

export type {
  ToolType,
  DesignLifecycleStatus,
  FaceId,
  CanvasState,
  ModelDimensions,
  Face,
  LayerType,
  BaseLayer,
  TextProperties,
  ImageProperties,
  ShapeProperties,
  Layer,
  CameraState,
  UIState,
  BoxType,
  BagType,
  PouchType,
  RigidBoxType,
  ContainerType,
  FlatType,
  LabelType,
  CardType,
  AccessoryType,
  ProductType,
  ProductCategory,
  SizePreset,
  ColorVariant,
  ModelState,
  HistoryState,
  DesignCoreState,
  DesignState,
} from './types';

export { useDesignStore } from './store';
export type { DesignStore } from './store';
