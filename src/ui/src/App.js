import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Brain, Calendar, Settings, Activity } from 'lucide-react';
import Timeline from './components/Timeline';
import Events from './components/Events';
import Plugins from './components/Plugins';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Brain className="h-8 w-8 text-indigo-600" />
                <h1 className="ml-3 text-xl font-semibold text-gray-900">
                  LifeOS Core
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Your personal life-data operating system
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <nav className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
            <div className="p-4">
              <nav className="space-y-2">
                <Link
                  to="/"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <Activity className="mr-3 h-5 w-5" />
                  Timeline
                </Link>
                <Link
                  to="/events"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  Events
                </Link>

                <Link
                  to="/plugins"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <Settings className="mr-3 h-5 w-5" />
                  Plugins
                </Link>
              </nav>
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 p-8">
            <Routes>
              <Route path="/" element={<Timeline />} />
              <Route path="/events" element={<Events />} />
              <Route path="/plugins" element={<Plugins />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App; 