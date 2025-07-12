import React from 'react';
import { Settings } from 'lucide-react';

function Plugins() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plugins</h1>
          <p className="text-gray-600">Manage integrations and automation</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Settings className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Plugin System</h3>
        <p className="mt-1 text-sm text-gray-500">
          Plugin management and scheduling coming soon.
        </p>
      </div>
    </div>
  );
}

export default Plugins; 