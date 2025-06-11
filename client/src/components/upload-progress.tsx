import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadProgressProps {
  uploadingFiles: string[];
  recentUploads: any[];
}

export function UploadProgress({ uploadingFiles, recentUploads }: UploadProgressProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Upload Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Uploads */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-4 mb-6">
            {uploadingFiles.map((fileName, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{fileName}</span>
                  <span className="text-sm text-blue-600">Processing...</span>
                </div>
                <Progress value={75} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Processing CSV data...</span>
                  <span>~30s remaining</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Database Status */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
          <div className="flex items-center space-x-2 text-blue-800">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Database Status</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Connected to PostgreSQL database • Ready for uploads
          </p>
        </div>

        {/* Recent Uploads */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Recent Activity</h4>
          {recentUploads.length > 0 ? (
            <div className="space-y-4">
              {recentUploads.slice(0, 5).map((upload: any) => (
                <div key={upload.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      upload.uploadStatus === 'completed' ? 'bg-green-100 text-green-600' :
                      upload.uploadStatus === 'error' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {upload.uploadStatus === 'completed' && <CheckCircle2 className="h-4 w-4" />}
                      {upload.uploadStatus === 'error' && <AlertCircle className="h-4 w-4" />}
                      {upload.uploadStatus === 'processing' && <Clock className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{upload.originalFilename}</p>
                      <p className="text-sm text-gray-600">
                        {formatTimeAgo(upload.createdAt)} • {upload.totalRows || 0} rows
                      </p>
                      {upload.uploadStatus === 'error' && upload.errorMessage && (
                        <p className="text-sm text-red-600">{upload.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No recent uploads</p>
              <p className="text-sm">Upload your first CSV file to get started</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
