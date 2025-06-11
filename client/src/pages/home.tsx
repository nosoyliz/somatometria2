import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { UploadProgress } from "@/components/upload-progress";
import { DatabaseInfo } from "@/components/database-info";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, CheckCircle, XCircle, Clock } from "lucide-react";

interface UploadStats {
  totalFiles: number;
  totalRecords: number;
  completedUploads: number;
  failedUploads: number;
  recentUploads: any[];
}

export default function Home() {
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const { data: stats } = useQuery<UploadStats>({
    queryKey: ['/api/stats'],
    refetchInterval: 5000,
  });

  const { data: uploads } = useQuery({
    queryKey: ['/api/uploads'],
    refetchInterval: 5000,
  });

  const handleUploadStart = (fileName: string) => {
    setUploadingFiles(prev => [...prev, fileName]);
  };

  const handleUploadComplete = (fileName: string) => {
    setUploadingFiles(prev => prev.filter(f => f !== fileName));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white p-2 rounded-lg">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">CSV Upload System</h1>
                <p className="text-sm text-gray-600">PostgreSQL Data Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span>{stats?.totalFiles || 0}</span> files uploaded
              </div>
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <FileUpload 
            onUploadStart={handleUploadStart}
            onUploadComplete={handleUploadComplete}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.totalRecords?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.totalFiles || 0}
                </div>
                <div className="text-sm text-gray-600">Files Uploaded</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats?.completedUploads || 0}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats?.failedUploads || 0}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Progress */}
          <UploadProgress 
            uploadingFiles={uploadingFiles}
            recentUploads={uploads || []}
          />

          {/* Database Info */}
          <DatabaseInfo stats={stats} />
        </div>

        {/* Recent Uploads Table */}
        {uploads && uploads.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Table Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rows
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Upload Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploads.slice(0, 10).map((upload: any) => (
                      <tr key={upload.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {upload.originalFilename}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{upload.tableName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {upload.totalRows?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            upload.uploadStatus === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : upload.uploadStatus === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {upload.uploadStatus === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {upload.uploadStatus === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                            {upload.uploadStatus === 'processing' && <Clock className="w-3 h-3 mr-1" />}
                            {upload.uploadStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(upload.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
