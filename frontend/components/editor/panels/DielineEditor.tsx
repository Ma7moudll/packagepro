'use client';

import { useState, useEffect, useCallback } from 'react';
import { DielineService, DielineTemplate, DielineDesign, DielineElement } from '@/lib/editor/services/dieline-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scissors, FoldVertical, Pipette, Search, Plus, Settings, Download } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';

interface DielineEditorProps {
  className?: string;
  onDesignChange?: (design: DielineDesign) => void;
}

export function DielineEditor({ className, onDesignChange }: DielineEditorProps) {
  const { language } = useLanguage();
  const [templates, setTemplates] = useState<DielineTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDesign, setCurrentDesign] = useState<DielineDesign | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Load templates on mount
  useEffect(() => {
    const allTemplates = DielineService.getTemplates();
    setTemplates(allTemplates);
  }, []);

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = useCallback((template: DielineTemplate) => {
    const design = DielineService.createDesign(template.id);
    if (design) {
      setCurrentDesign(design);
      onDesignChange?.(design);
    }
  }, [onDesignChange]);

  const handleExportSVG = useCallback(() => {
    if (!currentDesign) return;

    const svgContent = DielineService.exportAsSVG(currentDesign);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDesign.template.name}-dieline.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, [currentDesign]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = [
    { value: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { value: 'box', label: language === 'ar' ? 'علب' : 'Boxes' },
    { value: 'bag', label: language === 'ar' ? 'أكياس' : 'Bags' },
    { value: 'card', label: language === 'ar' ? 'بطاقات' : 'Cards' },
    { value: 'tube', label: language === 'ar' ? 'أنابيب' : 'Tubes' },
    { value: 'tray', label: language === 'ar' ? 'صواني' : 'Trays' },
  ];

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              {language === 'ar' ? 'تصميم Dieline' : 'Dieline Design'}
            </CardTitle>
            {currentDesign && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCustomizer(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportSVG}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {currentDesign && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{currentDesign.template.name}</span>
              <Badge className={getDifficultyColor(currentDesign.template.difficulty)}>
                {currentDesign.template.difficulty}
              </Badge>
              <span>
                {currentDesign.template.dimensions.length} × {currentDesign.template.dimensions.width} × {currentDesign.template.dimensions.height}mm
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {!currentDesign ? (
            // Template Selection
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={language === 'ar' ? 'البحث في القوالب...' : 'Search templates...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Templates Grid */}
              <ScrollArea className="h-80">
                <div className="grid grid-cols-2 gap-3">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                          {/* Placeholder for template thumbnail */}
                          <div className="text-xs text-muted-foreground">
                            {template.category}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                            <Badge className={`text-xs ${getDifficultyColor(template.difficulty)}`}>
                              {template.difficulty}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {template.dimensions.length}×{template.dimensions.width}×{template.dimensions.height}mm
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            // Design View
            <div className="space-y-4">
              {/* Dieline Preview */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="aspect-video bg-white rounded border flex items-center justify-center">
                  {/* SVG Preview */}
                  <div className="text-center text-muted-foreground">
                    <Scissors className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">
                      {language === 'ar' ? 'معاينة Dieline' : 'Dieline Preview'}
                    </p>
                    <p className="text-xs">
                      {language === 'ar' ? 'سيتم عرض التصميم هنا' : 'Design will be displayed here'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Design Elements */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    {language === 'ar' ? 'عناصر التصميم' : 'Design Elements'}
                  </Label>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {currentDesign.elements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">
                      {language === 'ar' ? 'لا توجد عناصر بعد' : 'No elements yet'}
                    </p>
                    <p className="text-xs">
                      {language === 'ar' ? 'اضف نص أو صور للتصميم' : 'Add text or images to design'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentDesign.elements.map((element) => (
                      <div key={element.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm capitalize">{element.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {element.face}
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manufacturing Info */}
              <div className="space-y-2 pt-3 border-t">
                <Label className="text-xs font-medium">
                  {language === 'ar' ? 'معلومات التصنيع' : 'Manufacturing Info'}
                </Label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Scissors className="w-3 h-3" />
                    <span>{currentDesign.template.cutLines.length} cuts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FoldVertical className="w-3 h-3" />
                    <span>{currentDesign.template.foldLines.length} folds</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Pipette className="w-3 h-3" />
                    <span>{currentDesign.template.glueFlaps.length} glue areas</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customizer Dialog */}
      <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'تخصيص Dieline' : 'Customize Dieline'}
            </DialogTitle>
          </DialogHeader>

          {currentDesign && (
            <div className="space-y-4">
              {/* Dimensions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {language === 'ar' ? 'الأبعاد' : 'Dimensions'}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Length (mm)</Label>
                    <Input
                      type="number"
                      value={currentDesign.template.dimensions.length}
                      onChange={(e) => {
                        // Update dimensions logic here
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Width (mm)</Label>
                    <Input
                      type="number"
                      value={currentDesign.template.dimensions.width}
                      onChange={(e) => {
                        // Update dimensions logic here
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height (mm)</Label>
                    <Input
                      type="number"
                      value={currentDesign.template.dimensions.height}
                      onChange={(e) => {
                        // Update dimensions logic here
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Material */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {language === 'ar' ? 'المادة' : 'Material'}
                </Label>
                <Select
                  value={currentDesign.customization.material}
                  onValueChange={(value) => {
                    // Update material logic here
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cardboard-kraft">Kraft Cardboard</SelectItem>
                    <SelectItem value="cardboard-white">White Cardboard</SelectItem>
                    <SelectItem value="corrugated-kraft">Corrugated Kraft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}