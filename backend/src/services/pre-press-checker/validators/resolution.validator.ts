import sharp from 'sharp';
import { ValidationError } from '../../../utils/errors';

export interface ResolutionCheckResult {
  valid: boolean;
  dpi: number;
  requiredDPI: number;
  issues: string[];
}

export async function checkResolution(
  buffer: Buffer,
  minDPI: number = 300
): Promise<ResolutionCheckResult> {
  const issues: string[] = [];

  try {
    const metadata = await sharp(buffer).metadata();
    const dpi = metadata.density || 72;

    if (dpi < minDPI) {
      issues.push(`Resolution is ${dpi} DPI, minimum required is ${minDPI} DPI`);
    }

    return {
      valid: issues.length === 0,
      dpi,
      requiredDPI: minDPI,
      issues,
    };
  } catch (error) {
    throw new ValidationError(`Failed to check resolution: ${error}`);
  }
}
