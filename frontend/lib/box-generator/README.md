# Parametric Box Generator

This directory contains the parametric box generator system for PackagePro.

## Features

### ✅ Parametric Box Generator
- **File**: `parametric-generator.ts`
- **Features**:
  - Generate regular boxes
  - Generate tray boxes
  - Generate sleeve boxes
  - Update dimensions dynamically
  - Calculate volume and surface area
  - Calculate material usage

### ✅ Custom Dimensions with Constraints
- **File**: `constraints.ts`
- **Features**:
  - Validate dimensions against constraints
  - Apply min/max constraints
  - Aspect ratio validation
  - Dimension warnings
  - Auto-correction of invalid dimensions

### ✅ Material Thickness Simulation
- **File**: `material-simulation.ts`
- **Features**:
  - Apply material thickness to structure
  - Calculate material volume
  - Calculate material weight
  - Simulate material deformation
  - Visualize thickness in 3D
  - Common material presets

### ✅ Folding/Unfolding Animation
- **File**: `folding-animation.ts`
- **Features**:
  - Calculate unfolded (flat) state
  - Calculate folded (3D) state
  - Interpolate between states
  - Smooth animation with easing
  - Progress control
  - Customizable duration

### ✅ Structural Integrity Validator
- **File**: `structural-validator.ts`
- **Features**:
  - Validate box structure
  - Check dimensions
  - Check material properties
  - Validate flaps
  - Validate glue tabs
  - Calculate strength score
  - Calculate stability score
  - Detailed error/warning messages

### ✅ Custom Shape Import (3D Models)
- **File**: `model-importer.ts`
- **Features**:
  - Import GLTF/GLB models
  - Import OBJ models
  - Import STL models
  - Validate imported models
  - Extract geometry information
  - Convert to box structure

## Usage

### Generate Box

```typescript
import { ParametricBoxGenerator } from "@/lib/box-generator/parametric-generator"

const generator = new ParametricBoxGenerator()

const structure = generator.generateRegularBox(
  {
    width: 200,
    height: 150,
    depth: 100,
    unit: "mm",
  },
  {
    thickness: 0.5,
    density: 700,
    stiffness: 2000000,
    color: "#f5f5dc",
  }
)
```

### Apply Constraints

```typescript
import { DimensionConstraints } from "@/lib/box-generator/constraints"

const constraints = new DimensionConstraints()
const defaultConstraints = constraints.getDefaultConstraints()

const validation = constraints.validateDimensions(dimensions, defaultConstraints)
if (!validation.isValid) {
  console.error("Validation errors:", validation.errors)
}

const correctedDimensions = constraints.applyConstraints(dimensions, defaultConstraints)
```

### Simulate Material Thickness

```typescript
import { MaterialThicknessSimulator } from "@/lib/box-generator/material-simulation"

const simulator = new MaterialThicknessSimulator()
const structureWithThickness = simulator.applyThickness(structure)
const weight = simulator.calculateMaterialWeight(structureWithThickness)
```

### Animate Folding

```typescript
import { FoldingAnimationController } from "@/lib/box-generator/folding-animation"

const controller = new FoldingAnimationController()

await controller.animateFolding(
  structure,
  true, // fold
  (state) => {
    console.log("Progress:", state.progress)
    // Update 3D view with state
  }
)
```

### Validate Structure

```typescript
import { StructuralIntegrityValidator } from "@/lib/box-generator/structural-validator"

const validator = new StructuralIntegrityValidator()
const validation = validator.validate(structure)

if (!validation.isValid) {
  console.error("Errors:", validation.errors)
}
console.log("Strength:", validation.strength)
console.log("Stability:", validation.stability)
```

### Import 3D Model

```typescript
import { CustomShapeImporter } from "@/lib/box-generator/model-importer"

const importer = new CustomShapeImporter()
const validation = importer.validateModel(file)

if (validation.isValid) {
  const structure = await importer.importGLTFModel(file, material)
}
```

## Components

### ParametricBoxGenerator
Main component for generating parametric boxes with all features integrated.

### Box3DViewer
3D visualization of the box structure using React Three Fiber.

### FoldingAnimation
Interactive folding/unfolding animation with progress control.

### CustomShapeImporter
File upload and import component for 3D models.

## Material Properties

Common material presets:
- **Cardboard**: 0.5mm, 700 kg/m³, 2M N/m²
- **Corrugated Cardboard**: 3.0mm, 150 kg/m³, 5M N/m²
- **Kraft Paper**: 0.2mm, 800 kg/m³, 1M N/m²
- **White Cardboard**: 0.8mm, 900 kg/m³, 3M N/m²

## Constraints

Default constraints:
- Min dimensions: 50mm
- Max dimensions: 1000mm (width/height), 500mm (depth)
- Aspect ratio warnings for extreme ratios

## Notes

- All dimensions are in millimeters internally
- Material thickness affects face dimensions
- Folding animation uses cubic easing
- 3D model import requires Three.js loaders
- Structural validation provides strength/stability scores (0-1)

