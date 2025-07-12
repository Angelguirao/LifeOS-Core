import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import moment from 'moment';
import { Plus, Search, Filter, Calendar, Tag } from 'lucide-react';

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    source: '',
    type: '',
    search: ''
  });
  const [newEvent, setNewEvent] = useState({
    title: '',
    source: '',
    type: '',
    timestamp: moment().format('YYYY-MM-DDTHH:mm'),
    tags: '',
    mood: '',
    metadata: {}
  });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        source: filters.source || undefined,
        type: filters.type || undefined,
        limit: 100
      };

      const response = await axios.get('/api/events', { params });
      setEvents(response.data.events);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    try {
      const eventData = {
        ...newEvent,
        tags: newEvent.tags ? newEvent.tags.split(',').map(tag => tag.trim()) : [],
        mood: newEvent.mood ? parseInt(newEvent.mood) : undefined,
        metadata: newEvent.metadata || {}
      };

      await axios.post('/api/events', eventData);
      
      // Reset form and refresh events
      setNewEvent({
        title: '',
        source: '',
        type: '',
        timestamp: moment().format('YYYY-MM-DDTHH:mm'),
        tags: '',
        mood: '',
        metadata: {}
      });
      setShowCreateForm(false);
      fetchEvents();
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await axios.delete(`/api/events/${eventId}`);
      fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600">Manage your life events</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <input
              type="text"
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              placeholder="Filter by source..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <input
              type="text"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              placeholder="Filter by type..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Create Event Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Event</h3>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source *
                </label>
                <input
                  type="text"
                  required
                  value={newEvent.source}
                  onChange={(e) => setNewEvent({ ...newEvent, source: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., spotify, calendar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <input
                  type="text"
                  required
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., music.play, calendar.meeting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timestamp *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newEvent.timestamp}
                  onChange={(e) => setNewEvent({ ...newEvent, timestamp: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={newEvent.tags}
                  onChange={(e) => setNewEvent({ ...newEvent, tags: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="comma-separated tags"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mood (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newEvent.mood}
                  onChange={(e) => setNewEvent({ ...newEvent, mood: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="1-10"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create Event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Events ({events.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {events.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create your first event to get started.
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {event.title}
                      </h4>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {event.source}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {event.type}
                      </span>
                      {event.mood && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Mood: {event.mood}/10
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {moment(event.timestamp).format('MMM D, YYYY h:mm A')}
                      </div>
                      
                      {event.tags && event.tags.length > 0 && (
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 mr-1" />
                          {event.tags.join(', ')}
                        </div>
                      )}
                    </div>
                    
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
                  
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Events; 