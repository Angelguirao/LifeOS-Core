import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import { Calendar, Clock, Tag, Filter, Search } from 'lucide-react';

function Timeline() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    source: '',
    type: '',
    startDate: moment().subtract(7, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    search: ''
  });
  const [groupBy, setGroupBy] = useState('day');
  const [sources, setSources] = useState([]);
  const [types, setTypes] = useState([]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        source: filters.source || undefined,
        type: filters.type || undefined,
        limit: 1000
      };

      const response = await axios.get('/api/timeline', { params });
      setEvents(response.data.events);
      setError(null);
    } catch (err) {
      setError('Failed to load events');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchSources();
    fetchTypes();
  }, [filters, groupBy]);

  const fetchSources = async () => {
    try {
      const response = await axios.get('/api/events/sources');
      setSources(response.data.sources);
    } catch (err) {
      console.error('Error fetching sources:', err);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await axios.get('/api/events/types');
      setTypes(response.data.types);
    } catch (err) {
      console.error('Error fetching types:', err);
    }
  };

  const groupEventsByPeriod = (events, groupBy) => {
    const grouped = {};
    
    events.forEach(event => {
      const date = moment(event.timestamp);
      let key;
      
      switch (groupBy) {
        case 'hour':
          key = date.format('YYYY-MM-DD HH:00');
          break;
        case 'day':
          key = date.format('YYYY-MM-DD');
          break;
        case 'week':
          key = date.format('YYYY-[W]WW');
          break;
        case 'month':
          key = date.format('YYYY-MM');
          break;
        default:
          key = date.format('YYYY-MM-DD');
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(event);
    });
    
    return grouped;
  };

  const getEventIcon = (type) => {
    switch (type.split('.')[0]) {
      case 'music':
        return '🎵';
      case 'calendar':
        return '📅';
      case 'journal':
        return '📝';
      case 'fitness':
        return '💪';
      case 'photo':
        return '📸';
      case 'location':
        return '📍';
      case 'communication':
        return '💬';
      case 'work':
        return '💼';
      case 'learning':
        return '📚';
      case 'finance':
        return '💰';
      default:
        return '📌';
    }
  };

  const getEventColor = (source) => {
    const colors = {
      spotify: 'bg-green-100 text-green-800',
      calendar: 'bg-blue-100 text-blue-800',
      journal: 'bg-purple-100 text-purple-800',
      fitness: 'bg-red-100 text-red-800',
      photos: 'bg-yellow-100 text-yellow-800',
      location: 'bg-indigo-100 text-indigo-800',
      communication: 'bg-pink-100 text-pink-800',
      work: 'bg-gray-100 text-gray-800',
      learning: 'bg-orange-100 text-orange-800',
      finance: 'bg-emerald-100 text-emerald-800'
    };
    return colors[source] || 'bg-gray-100 text-gray-800';
  };

  const filteredEvents = events.filter(event => {
    if (filters.search) {
      const searchText = `${event.title} ${event.source} ${event.type}`.toLowerCase();
      if (!searchText.includes(filters.search.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const groupedEvents = groupEventsByPeriod(filteredEvents, groupBy);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
          <p className="text-gray-600">View your life events chronologically</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="hour">By Hour</option>
            <option value="day">By Day</option>
            <option value="week">By Week</option>
            <option value="month">By Month</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search events..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Sources</option>
              {sources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {Object.keys(groupedEvents).length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or add some events.
            </p>
          </div>
        ) : (
          Object.entries(groupedEvents)
            .sort(([a], [b]) => moment(b).valueOf() - moment(a).valueOf())
            .map(([period, periodEvents]) => (
              <div key={period} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    {groupBy === 'hour' && moment(period).format('MMM D, YYYY h:mm A')}
                    {groupBy === 'day' && moment(period).format('dddd, MMMM D, YYYY')}
                    {groupBy === 'week' && `Week ${period}`}
                    {groupBy === 'month' && moment(period).format('MMMM YYYY')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {periodEvents.length} event{periodEvents.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {periodEvents
                    .sort((a, b) => moment(b.timestamp).valueOf() - moment(a.timestamp).valueOf())
                    .map((event) => (
                      <div key={event.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <span className="text-2xl">{getEventIcon(event.type)}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {event.title}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventColor(event.source)}`}>
                                {event.source}
                              </span>
                              {event.mood && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Mood: {event.mood}/10
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {moment(event.timestamp).format('h:mm A')}
                              </div>
                              
                              <div className="flex items-center">
                                <Tag className="h-4 w-4 mr-1" />
                                {event.type}
                              </div>
                              
                              {event.duration && (
                                <div>
                                  {Math.floor(event.duration / 60)}m {event.duration % 60}s
                                </div>
                              )}
                            </div>
                            
                            {event.tags && event.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {event.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <div className="mt-2 text-sm text-gray-600">
                                {Object.entries(event.metadata).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span> {String(value)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default Timeline; 