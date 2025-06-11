import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Table, BarChart3 } from "lucide-react";

interface DatabaseInfoProps {
  stats?: {
    totalFiles: number;
    totalRecords: number;
    completedUploads: number;
    failedUploads: number;
  };
}

export function DatabaseInfo({ stats }: DatabaseInfoProps) {
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Database Information</CardTitle>
          <div className="flex items-center space-x-2 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Connected</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats?.totalRecords?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-600">Total Records</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.completedUploads || 0}
            </div>
            <div className="text-sm text-gray-600">Successful Uploads</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {stats?.totalFiles || 0}
            </div>
            <div className="text-sm text-gray-600">Total Files</div>
          </div>
        </div>

        {/* Database Schema Preview */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Table className="h-5 w-5 text-gray-600" />
            <h4 className="font-medium text-gray-900">Schema Structure</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-900">Table</th>
                  <th className="text-left py-2 font-medium text-gray-900">Purpose</th>
                  <th className="text-left py-2 font-medium text-gray-900">Key Columns</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-mono">file_uploads</td>
                  <td className="py-2">Track upload metadata</td>
                  <td className="py-2">id, filename, status, created_at</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-mono">table_columns</td>
                  <td className="py-2">Store column definitions</td>
                  <td className="py-2">upload_id, column_name, column_type</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-mono">csv_data</td>
                  <td className="py-2">Store actual CSV data</td>
                  <td className="py-2">upload_id, row_data, row_index</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-1 gap-3">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Automatic Schema Detection</p>
              <p className="text-sm text-blue-700">Columns are automatically typed based on CSV data</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <BarChart3 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Data Validation</p>
              <p className="text-sm text-green-700">Built-in validation and error handling</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
