'use client';

import { useState, useEffect } from 'react';
import { TutorialService, TutorialStep } from '@/lib/editor/services/tutorial';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, ChevronLeft, ChevronRight, Play, BookOpen } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialOverlay({ isOpen, onClose }: TutorialOverlayProps) {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });

  useEffect(() => {
    // Set up tutorial step change listener
    TutorialService.onTutorialStepChange((step) => {
      setCurrentStep(step);
      setProgress(TutorialService.getProgress());
    });

    return () => {
      // Cleanup
      TutorialService.onTutorialStepChange(() => {});
    };
  }, []);

  useEffect(() => {
    if (isOpen && !TutorialService.isTutorialActive()) {
      // Start getting started tutorial by default
      TutorialService.startTutorial('getting-started');
    }
  }, [isOpen]);

  const handleNext = () => {
    TutorialService.nextStep();
  };

  const handlePrevious = () => {
    TutorialService.previousStep();
  };

  const handleClose = () => {
    TutorialService.endTutorial();
    onClose();
  };

  const handleAction = () => {
    if (currentStep?.action) {
      TutorialService.handleAction(currentStep.action);
      TutorialService.nextStep();
    }
  };

  if (!isOpen || !currentStep) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {currentStep.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {language === 'ar' ? 'الخطوة' : 'Step'} {progress.current} {language === 'ar' ? 'من' : 'of'} {progress.total}
              </span>
              <span>{Math.round(progress.percentage)}%</span>
            </div>
            <Progress value={progress.percentage} className="h-1" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {currentStep.description}
          </p>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm">{currentStep.content}</p>
          </div>

          {currentStep.action && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                💡 {language === 'ar' ? 'جرب:' : 'Try:'} {currentStep.action.replace('-', ' ')}
              </p>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={progress.current === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              {language === 'ar' ? 'السابق' : 'Previous'}
            </Button>

            <div className="flex gap-2">
              {currentStep.action && (
                <Button
                  size="sm"
                  onClick={handleAction}
                  className="gap-1"
                >
                  <Play className="w-4 h-4" />
                  {language === 'ar' ? 'جرب الآن' : 'Try Now'}
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleNext}
              >
                {progress.current === progress.total ? (
                  language === 'ar' ? 'إنهاء' : 'Finish'
                ) : (
                  <>
                    {language === 'ar' ? 'التالي' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}