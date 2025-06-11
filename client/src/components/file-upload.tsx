import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CloudUpload, File, X, Upload, CheckCircle2 } from "lucide-react";

interface FileUploadProps {
  onUploadStart: (fileName: string) => void;
  onUploadComplete: (fileName: string) => void;
}

interface SelectedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export function FileUpload({ onUploadStart, onUploadComplete }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: (data, file) => {
      setSelectedFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'completed' as const, progress: 100 }
            : f
        )
      );
      
      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully. ${data.rowsProcessed} rows processed.`,
      });
      
      onUploadComplete(file.name);
      queryClient.invalidateQueries({ queryKey: ['/api/uploads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error: Error, file) => {
      setSelectedFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'error' as const, error: error.message }
            : f
        )
      );
      
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}: ${error.message}`,
        variant: "destructive",
      });
      
      onUploadComplete(file.name);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0,
    }));
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
    
    for (const fileItem of pendingFiles) {
      setSelectedFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'uploading' as const, progress: 0 }
            : f
        )
      );
      
      onUploadStart(fileItem.file.name);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setSelectedFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);
      
      try {
        await uploadMutation.mutateAsync(fileItem.file);
      } finally {
        clearInterval(progressInterval);
      }
    }
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
  const isUploading = selectedFiles.some(f => f.status === 'uploading');

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload CSV Files</h2>
          <p className="text-gray-600">Select multiple CSV files to upload to the PostgreSQL database</p>
        </div>

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragActive 
              ? 'border-primary bg-blue-50' 
              : 'border-gray-300 hover:border-primary hover:bg-blue-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="mb-4">
            <CloudUpload className="h-12 w-12 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive ? 'Drop the files here' : 'Drop your CSV files here'}
          </h3>
          <p className="text-gray-600 mb-4">or click to browse files</p>
          <Button type="button" className="bg-primary hover:bg-blue-700">
            Choose Files
          </Button>
          <p className="text-xs text-gray-500 mt-3">Supported formats: CSV (up to 10MB each)</p>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Selected Files</h4>
            <div className="space-y-3">
              {selectedFiles.map((fileItem) => (
                <div key={fileItem.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      fileItem.status === 'completed' ? 'bg-green-100 text-green-600' :
                      fileItem.status === 'error' ? 'bg-red-100 text-red-600' :
                      fileItem.status === 'uploading' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {fileItem.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <File className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{fileItem.file.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(fileItem.file.size)} • CSV File
                      </p>
                      {fileItem.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={fileItem.progress} className="h-2" />
                        </div>
                      )}
                      {fileItem.error && (
                        <p className="text-sm text-red-600 mt-1">{fileItem.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      fileItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                      fileItem.status === 'error' ? 'bg-red-100 text-red-800' :
                      fileItem.status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {fileItem.status === 'pending' && 'Pending'}
                      {fileItem.status === 'uploading' && 'Uploading...'}
                      {fileItem.status === 'completed' && 'Completed'}
                      {fileItem.status === 'error' && 'Error'}
                    </span>
                    {fileItem.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileItem.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <Button 
                variant="outline" 
                onClick={clearAllFiles}
                disabled={isUploading}
              >
                Clear All
              </Button>
              <Button 
                onClick={uploadFiles}
                disabled={pendingFiles.length === 0 || isUploading}
                className="bg-primary hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files ({pendingFiles.length})
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
