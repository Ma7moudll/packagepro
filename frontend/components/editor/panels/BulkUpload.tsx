'use client';

import { useState, useCallback, useRef } from 'react';
import { BulkUploadService, UploadFile, BulkUploadResult } from '@/lib/editor/services/bulk-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  File,
  Image as ImageIcon,
  FileText,
  Pause,
  Play,
  Trash2
} from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { cn } from '@/lib/utils';

interface BulkUploadProps {
  className?: string;
  onUploadComplete?: (files: UploadFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
}

export function BulkUpload({
  className,
  onUploadComplete,
  maxFiles = 20,
  maxFileSize = 50,
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
}: BulkUploadProps) {
  const { language } = useLanguage();
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadService] = useState(() => new BulkUploadService({
    maxFiles,
    maxFileSize,
    allowedTypes,
    autoStart: false,
  }));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set up event handlers
  useState(() => {
    uploadService.on('progress', (file: UploadFile) => {
      setUploads(prev => prev.map(u => u.id === file.id ? file : u));
    });

    uploadService.on('complete', (result: BulkUploadResult) => {
      setUploadResult(result);
      setIsUploading(false);
      onUploadComplete?.(result.successful);
    });

    uploadService.on('error', (file: UploadFile, error: string) => {
      console.error('Upload error:', error);
    });
  });

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    try {
      const newUploads = uploadService.addFiles(files);
      setUploads(prev => [...prev, ...newUploads]);
    } catch (error) {
      console.error('Error adding files:', error);
    }
  }, [uploadService]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesSelected(files);
    }
  }, [handleFilesSelected]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelected(files);
    }
  }, [handleFilesSelected]);

  const handleStartUpload = useCallback(async () => {
    setIsUploading(true);
    try {
      await uploadService.startUpload();
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
    }
  }, [uploadService]);

  const handleRemoveFile = useCallback((fileId: string) => {
    uploadService.removeFile(fileId);
    setUploads(prev => prev.filter(u => u.id !== fileId));
  }, [uploadService]);

  const handleCancelUpload = useCallback((fileId: string) => {
    uploadService.cancelUpload(fileId);
  }, [uploadService]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'uploading':
        return <Badge className="bg-blue-100 text-blue-800">Uploading</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const totalProgress = uploads.length > 0
    ? Math.round(uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length)
    : 0;

  const hasPendingUploads = uploads.some(u => u.status === 'pending');
  const hasActiveUploads = uploads.some(u => u.status === 'uploading');

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {language === 'ar' ? 'رفع ملفات متعددة' : 'Bulk Upload'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              {language === 'ar'
                ? 'اسحب وأفلت الملفات هنا، أو انقر للاختيار'
                : 'Drag & drop files here, or click to select'
              }
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {language === 'ar'
                ? `حتى ${maxFiles} ملف، بحد أقصى ${maxFileSize}MB لكل ملف`
                : `Up to ${maxFiles} files, max ${maxFileSize}MB each`
              }
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {language === 'ar' ? 'اختيار الملفات' : 'Select Files'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'التقدم' : 'Progress'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {totalProgress}%
                </span>
              </div>
              <Progress value={totalProgress} className="w-full" />

              <div className="flex gap-2">
                {(hasPendingUploads || hasActiveUploads) && (
                  <Button
                    size="sm"
                    onClick={handleStartUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                      </>
                    ) : (
                      language === 'ar' ? 'بدء الرفع' : 'Start Upload'
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* File List */}
          {uploads.length > 0 && (
            <ScrollArea className="h-60">
              <div className="space-y-2">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {upload.thumbnail ? (
                        <img
                          src={upload.thumbnail}
                          alt={upload.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        getFileIcon(upload.type)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {upload.name}
                        </span>
                        {getStatusIcon(upload.status)}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{BulkUploadService.formatFileSize(upload.size)}</span>
                        {getStatusBadge(upload.status)}
                      </div>

                      {upload.status === 'uploading' && (
                        <Progress value={upload.progress} className="mt-2 h-1" />
                      )}

                      {upload.error && (
                        <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {upload.status === 'uploading' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelUpload(upload.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Pause className="w-3 h-3" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFile(upload.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'ar'
                  ? `تم رفع ${uploadResult.successful.length} ملف بنجاح من أصل ${uploadResult.successful.length + uploadResult.failed.length} ملف`
                  : `Successfully uploaded ${uploadResult.successful.length} of ${uploadResult.successful.length + uploadResult.failed.length} files`
                }
                {uploadResult.failed.length > 0 && (
                  <span className="text-red-600">
                    {language === 'ar'
                      ? ` (${uploadResult.failed.length} فشل)`
                      : ` (${uploadResult.failed.length} failed)`
                    }
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">
              {language === 'ar' ? 'أنواع الملفات المدعومة:' : 'Supported file types:'}
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>{language === 'ar' ? 'صور: JPEG, PNG, GIF, WebP' : 'Images: JPEG, PNG, GIF, WebP'}</li>
              <li>{language === 'ar' ? 'مستندات: PDF' : 'Documents: PDF'}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}