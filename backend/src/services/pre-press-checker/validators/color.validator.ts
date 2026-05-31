import sharp from 'sharp';

export interface ColorCheckResult {
  valid: boolean;
  colorMode: string;
  requiredColorMode: string;
  issues: string[];
}

export async function checkColorMode(
  buffer: Buffer,
  requiredMode: 'CMYK' | 'RGB' = 'CMYK'
): Promise<ColorCheckResult> {
  const issues: string[] = [];

  try {
    const metadata = await sharp(buffer).metadata();
    // Sharp doesn't directly provide color mode, but we can infer from space
    const colorSpace = metadata.space || 'srgb';
    const colorMode = colorSpace === 'srgb' ? 'RGB' : 'CMYK'; // Simplified

    if (colorMode !== requiredMode) {
      issues.push(
        `Color mode is ${colorMode}, but ${requiredMode} is required for print`
      );
    }

    return {
      valid: issues.length === 0,
      colorMode,
      requiredColorMode: requiredMode,
      issues,
    };
  } catch (error) {
    // Not an image file
    return {
      valid: false,
      colorMode: 'unknown',
      requiredColorMode: requiredMode,
      issues: ['Unable to determine color mode'],
    };
  }
}
