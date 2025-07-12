const express = require('express');
const router = express.Router();
const EventManager = require('../../lib/eventManager');
const moment = require('moment');

// Initialize event manager
const eventManager = new EventManager();

// Initialize database on startup
let isInitialized = false;
eventManager.initialize()
  .then(() => {
    isInitialized = true;
    console.log('✅ Timeline EventManager initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to initialize Timeline EventManager:', error);
    process.exit(1);
  });

// Middleware to ensure database is initialized
const ensureInitialized = (req, res, next) => {
  if (!isInitialized) {
    return res.status(503).json({ error: 'Database is initializing, please try again' });
  }
  next();
};

/**
 * GET /api/timeline
 * Get timeline view with optional date range
 */
router.get('/', ensureInitialized, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      source,
      type,
      groupBy = 'day' // day, week, month
    } = req.query;

    // Default to last 30 days if no date range provided
    const defaultStartDate = moment().subtract(30, 'days').toISOString();
    const defaultEndDate = moment().toISOString();

    const events = await eventManager.getEvents({
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
      source,
      type,
      orderBy: 'timestamp ASC',
      limit: 1000
    });

    // Group events by time period
    const groupedEvents = groupEventsByPeriod(events, groupBy);

    res.json({
      events,
      grouped: groupedEvents,
      period: {
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate,
        groupBy
      }
    });
  } catch (error) {
    console.error('Error getting timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/timeline/daily
 * Get daily timeline view
 */
router.get('/daily', ensureInitialized, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? moment(date) : moment();
    
    const startDate = targetDate.startOf('day').toISOString();
    const endDate = targetDate.endOf('day').toISOString();

    const events = await eventManager.getEvents({
      startDate,
      endDate,
      orderBy: 'timestamp ASC',
      limit: 100
    });

    // Group by hour
    const hourlyEvents = groupEventsByHour(events);

    res.json({
      date: targetDate.format('YYYY-MM-DD'),
      events,
      hourly: hourlyEvents,
      summary: generateDailySummary(events)
    });
  } catch (error) {
    console.error('Error getting daily timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/timeline/weekly
 * Get weekly timeline view
 */
router.get('/weekly', ensureInitialized, async (req, res) => {
  try {
    const { week } = req.query;
    const targetWeek = week ? moment(week) : moment();
    
    const startDate = targetWeek.startOf('week').toISOString();
    const endDate = targetWeek.endOf('week').toISOString();

    const events = await eventManager.getEvents({
      startDate,
      endDate,
      orderBy: 'timestamp ASC',
      limit: 500
    });

    // Group by day
    const dailyEvents = groupEventsByDay(events);

    res.json({
      week: targetWeek.format('YYYY-[W]WW'),
      events,
      daily: dailyEvents,
      summary: generateWeeklySummary(events)
    });
  } catch (error) {
    console.error('Error getting weekly timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/timeline/monthly
 * Get monthly timeline view
 */
router.get('/monthly', ensureInitialized, async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month ? moment(month) : moment();
    
    const startDate = targetMonth.startOf('month').toISOString();
    const endDate = targetMonth.endOf('month').toISOString();

    const events = await eventManager.getEvents({
      startDate,
      endDate,
      orderBy: 'timestamp ASC',
      limit: 1000
    });

    // Group by week
    const weeklyEvents = groupEventsByWeek(events);

    res.json({
      month: targetMonth.format('YYYY-MM'),
      events,
      weekly: weeklyEvents,
      summary: generateMonthlySummary(events)
    });
  } catch (error) {
    console.error('Error getting monthly timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/timeline/activity
 * Get activity heatmap data
 */
router.get('/activity', ensureInitialized, async (req, res) => {
  try {
    const { startDate, endDate, source, type } = req.query;
    
    const defaultStartDate = moment().subtract(90, 'days').toISOString();
    const defaultEndDate = moment().toISOString();

    const events = await eventManager.getEvents({
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
      source,
      type,
      limit: 5000
    });

    const activityData = generateActivityHeatmap(events);

    res.json({
      activity: activityData,
      period: {
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate
      }
    });
  } catch (error) {
    console.error('Error getting activity data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions

function groupEventsByPeriod(events, groupBy) {
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
}

function groupEventsByHour(events) {
  const hourly = {};
  
  for (let hour = 0; hour < 24; hour++) {
    const hourKey = hour.toString().padStart(2, '0');
    hourly[hourKey] = [];
  }
  
  events.forEach(event => {
    const hour = moment(event.timestamp).format('HH');
    hourly[hour].push(event);
  });
  
  return hourly;
}

function groupEventsByDay(events) {
  const daily = {};
  
  for (let day = 0; day < 7; day++) {
    const dayName = moment().day(day).format('dddd');
    daily[dayName] = [];
  }
  
  events.forEach(event => {
    const dayName = moment(event.timestamp).format('dddd');
    daily[dayName].push(event);
  });
  
  return daily;
}

function groupEventsByWeek(events) {
  const weekly = {};
  
  events.forEach(event => {
    const weekKey = moment(event.timestamp).format('YYYY-[W]WW');
    if (!weekly[weekKey]) {
      weekly[weekKey] = [];
    }
    weekly[weekKey].push(event);
  });
  
  return weekly;
}

function generateDailySummary(events) {
  const summary = {
    total: events.length,
    bySource: {},
    byType: {},
    mood: { average: 0, count: 0 },
    duration: { total: 0, count: 0 }
  };
  
  events.forEach(event => {
    // Count by source
    summary.bySource[event.source] = (summary.bySource[event.source] || 0) + 1;
    
    // Count by type
    summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
    
    // Average mood
    if (event.mood) {
      summary.mood.average += event.mood;
      summary.mood.count += 1;
    }
    
    // Total duration
    if (event.duration) {
      summary.duration.total += event.duration;
      summary.duration.count += 1;
    }
  });
  
  if (summary.mood.count > 0) {
    summary.mood.average = summary.mood.average / summary.mood.count;
  }
  
  return summary;
}

function generateWeeklySummary(events) {
  const summary = generateDailySummary(events);
  
  // Add weekly-specific metrics
  summary.uniqueDays = new Set(events.map(e => moment(e.timestamp).format('YYYY-MM-DD'))).size;
  summary.mostActiveDay = getMostActiveDay(events);
  
  return summary;
}

function generateMonthlySummary(events) {
  const summary = generateDailySummary(events);
  
  // Add monthly-specific metrics
  summary.uniqueWeeks = new Set(events.map(e => moment(e.timestamp).format('YYYY-[W]WW'))).size;
  summary.mostActiveWeek = getMostActiveWeek(events);
  
  return summary;
}

function getMostActiveDay(events) {
  const dayCounts = {};
  
  events.forEach(event => {
    const day = moment(event.timestamp).format('dddd');
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  
  return Object.entries(dayCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
}

function getMostActiveWeek(events) {
  const weekCounts = {};
  
  events.forEach(event => {
    const week = moment(event.timestamp).format('YYYY-[W]WW');
    weekCounts[week] = (weekCounts[week] || 0) + 1;
  });
  
  return Object.entries(weekCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
}

function generateActivityHeatmap(events) {
  const heatmap = {};
  
  events.forEach(event => {
    const date = moment(event.timestamp).format('YYYY-MM-DD');
    heatmap[date] = (heatmap[date] || 0) + 1;
  });
  
  return heatmap;
}

module.exports = router; 