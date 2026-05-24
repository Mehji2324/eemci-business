const db = require('../config/db');
const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('./notificationController');

exports.createEvent = asyncHandler(async (req, res) => {
    const { title, description, date, location, type } = req.body;
    const file = req.file;
    
    const file_path = file ? `/uploads/${file.filename}` : null;

    const eventId = await Event.create({ 
        title, 
        description, 
        date, 
        location, 
        type, 
        file_path 
    });

    // Notify all users about the new event
    const [allUsers] = await db.execute('SELECT id FROM users');
    for (const user of allUsers) {
      await createNotification(
        user.id,
        'event',
        'New Event Published',
        `A new event has been published: "${title}"`
      );
    }

    res.status(201).json({ 
        success: true, 
        message: 'Published successfully', 
        eventId 
    });
});

exports.getAllEvents = asyncHandler(async (req, res) => {
    const events = await Event.getAll();
    res.json(events);
});

exports.deleteEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await Event.delete(id);
    res.json({ success: true, message: 'Deleted successfully' });
});

exports.getEventsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const events = await Event.getByType(type);
    res.json(events);
});
