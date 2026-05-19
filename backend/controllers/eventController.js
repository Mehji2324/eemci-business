const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');

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
