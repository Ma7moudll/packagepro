'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '@/lib/editor/state/store';
import { PrintValidationService, ValidationReport, ValidationResult } from '@/lib/editor/services/print-validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Info, XCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';

interface ValidationPanelProps {
  className?: string;
}

export function ValidationPanel({ className }: ValidationPanelProps) {
  const { language } = useLanguage();
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickResults, setQuickResults] = useState<ValidationResult[]>([]);

  const layers = useDesignStore((s) => s.layers);
  const model = useDesignStore((s) => s.model);
  const canvas = useDesignStore((s) => s.canvas);
  const zones = useDesignStore((s) => s.zones);
  const structureType = useDesignStore((s) => s.structureType);

  // Quick validation on layer changes
  useEffect(() => {
    const runQuickValidation = async () => {
      const results = await PrintValidationService.quickValidate(layers);
      setQuickResults(results);
    };

    runQuickValidation();
  }, [layers]);

  const runFullValidation = async () => {
    setLoading(true);
    try {
      // M7: zone-aware, per-face prepress report from the backend ProductStructure.
      const validationReport = await PrintValidationService.validatePrintReady(layers, model, canvas, zones as any);
      setReport(validationReport);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'فحص الطباعة' : 'Print Validation'}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={runFullValidation}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>

          {report && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Progress value={report.score} className="flex-1" />
                <span className={`text-sm font-medium ${getScoreColor(report.score)}`}>
                  {report.score}%
                </span>
              </div>

              <div className="flex gap-2 text-xs">
                <Badge variant="destructive" className="px-2">
                  {report.errors} {language === 'ar' ? 'أخطاء' : 'Errors'}
                </Badge>
                <Badge variant="secondary" className="px-2">
                  {report.warnings} {language === 'ar' ? 'تحذيرات' : 'Warnings'}
                </Badge>
                <Badge variant="default" className="px-2">
                  {report.passed} {language === 'ar' ? 'نجح' : 'Passed'}
                </Badge>
              </div>

              {report.printReady ? (
                <div className="flex items-center gap-2 text-green-600 text-xs">
                  <CheckCircle className="w-4 h-4" />
                  {language === 'ar' ? 'جاهز للطباعة' : 'Print Ready'}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 text-xs">
                  <XCircle className="w-4 h-4" />
                  {language === 'ar' ? 'غير جاهز للطباعة' : 'Not Print Ready'}
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Quick Validation Results */}
          {quickResults.length > 0 && !report && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                {language === 'ar' ? 'فحص سريع' : 'Quick Check'}
              </h4>
              {quickResults.slice(0, 3).map((result, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  {getSeverityIcon(result.rule.severity)}
                  <span className="flex-1 truncate">{result.message}</span>
                  <Badge variant={result.passed ? 'default' : getSeverityColor(result.rule.severity) as any} className="text-xs">
                    {result.passed ? (language === 'ar' ? '✓' : 'OK') : (language === 'ar' ? '!' : '!')}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Full Validation Results */}
          {report && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-xs font-medium text-muted-foreground">
                {language === 'ar' ? 'تفاصيل الفحص' : 'Validation Details'}
              </h4>

              {/* M7: Per-face breakdown from the backend ProductStructure */}
              {report.perFace && report.perFace.length > 0 && (
                <div className="space-y-1">
                  {report.perFace.map((face) => (
                    <div key={face.faceId} className="flex items-center gap-2 text-xs border rounded p-1.5">
                      <span className="flex-1 font-medium truncate">{face.faceName}</span>
                      {face.missingRequiredZones.length > 0 && (
                        <span className="text-red-500 truncate max-w-[60%]">
                          {language === 'ar' ? 'مطلوب: ' : 'Requires: '}
                          {face.missingRequiredZones.join(', ')}
                        </span>
                      )}
                      <Badge
                        variant={face.printReady ? 'default' : 'destructive'}
                        className="text-[10px] px-1.5"
                      >
                        {face.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {report.results.map((result, index) => (
                <div key={index} className="border rounded p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(result.rule.severity)}
                    <span className="text-xs font-medium flex-1">{result.rule.name}</span>
                    <Badge variant={result.passed ? 'default' : getSeverityColor(result.rule.severity) as any} className="text-xs">
                      {result.passed ? (language === 'ar' ? 'نجح' : 'Pass') : (language === 'ar' ? 'فشل' : 'Fail')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                  {result.suggestions && result.suggestions.length > 0 && (
                    <div className="text-xs text-blue-600">
                      <strong>{language === 'ar' ? 'اقتراحات:' : 'Suggestions:'}</strong>
                      <ul className="list-disc list-inside mt-1">
                        {result.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!report && (
            <div className="text-center py-4">
              <Button onClick={runFullValidation} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    {language === 'ar' ? 'جاري الفحص...' : 'Validating...'}
                  </>
                ) : (
                  language === 'ar' ? 'فحص كامل' : 'Full Validation'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}