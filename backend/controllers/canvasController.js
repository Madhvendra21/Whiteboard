const Canvas = require("../models/canvasModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");

// Create a new canvas
exports.createCanvas = async (req, res) => {
    try {
        const userId = req.userId; // Get the authenticated user ID

        const newCanvas = new Canvas({
            owner: userId,
            shared: [],
            elements: []
        });

        await newCanvas.save();
        res.status(201).json({ message: "Canvas created successfully", canvasId: newCanvas._id });
    } catch (error) {
        res.status(500).json({ error: "Failed to create canvas", details: error.message });
    }
};

// Update an existing canvas (when elements are drawn)
exports.updateCanvas = async (req, res) => {
    try {
        const { canvasId, elements } = req.body;
        const userId = req.userId;
        console.log("canvas id ", canvasId)

        const canvas = await Canvas.findById(canvasId);
        if (!canvas) {
            return res.status(404).json({ error: "Canvas not found" });
        }

        // Ensure only the owner or shared users can update
        if (canvas.owner.toString() !== userId && !canvas.shared.includes(userId)) {
            return res.status(403).json({ error: "Unauthorized to update this canvas" });
        }

        canvas.elements = elements;
        await canvas.save();

        console.log("saved")

        res.json({ message: "Canvas updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update canvas", details: error.message });
    }
};

// Load a canvas
exports.loadCanvas = async (req, res) => {
    try {
        const canvasId = req.params.id;
        const userId = req.userId;

        const canvas = await Canvas.findById(canvasId);
        if (!canvas) {
            return res.status(404).json({ error: "Canvas not found" });
        }

        // Ensure only the owner or shared users can access it
        if (canvas.owner.toString() !== userId && !canvas.shared.includes(userId)) {
            return res.status(403).json({ error: "Unauthorized to access this canvas" });
        }

        res.json(canvas);
    } catch (error) {
        res.status(500).json({ error: "Failed to load canvas", details: error.message });
    }
};


exports.shareCanvas = async (req, res) => {
    try {
        const { email } = req.body; 
        const canvasId = req.params.id;
        const userId = req.userId; 

        // Find the user by email
        const userToShare = await User.findOne({ email });
        if (!userToShare) {
            return res.status(404).json({ error: "User with this email not found" });
        }

        const canvas = await Canvas.findById(canvasId);
        if (!canvas) {
            return res.status(404).json({ error: "Canvas not found" });
        }

        if (canvas.owner.toString() !== userId) {
            return res.status(403).json({ error: "Only the owner can share this canvas" });
        }

        // Ensure the shared userId is an ObjectId
        const sharedUserId = new mongoose.Types.ObjectId(userToShare._id);

        // Prevent adding the owner to shared list
        if (canvas.owner.toString() === sharedUserId.toString()) {
            return res.status(400).json({ error: "Owner cannot be added to shared list" });
        }

        // Check if the user is already in the shared array
        const alreadyShared = canvas.shared.some(id => id.toString() === sharedUserId.toString());
        if (alreadyShared) {
            return res.status(400).json({ error: "Already shared with user" });
        }

        // Add user to shared list
        canvas.shared.push(sharedUserId);
        await canvas.save();

        res.json({ message: "Canvas shared successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to share canvas", details: error.message });
    }
};


// Unshare canvas from a user
exports.unshareCanvas = async (req, res) => {
    try {
        const { userIdToRemove } = req.body;
        const canvasId = req.params.id;
        const userId = req.userId;

        const canvas = await Canvas.findById(canvasId);
        if (!canvas) {
            return res.status(404).json({ error: "Canvas not found" });
        }

        if (canvas.owner.toString() !== userId) {
            return res.status(403).json({ error: "Only the owner can unshare this canvas" });
        }

        canvas.shared = canvas.shared.filter(id => id.toString() !== userIdToRemove);
        await canvas.save();

        res.json({ message: "Canvas unshared successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to unshare canvas", details: error.message });
    }
};

exports.deleteCanvas = async (req, res) => {
    try {
        const canvasId = req.params.id;
        const userId = req.userId;

        const canvas = await Canvas.findById(canvasId);
        if (!canvas) {
            return res.status(404).json({ error: "Canvas not found" });
        }

        if (canvas.owner.toString() !== userId) {
            return res.status(403).json({ error: "Only the owner can delete this canvas" });
        }

        await Canvas.findByIdAndDelete(canvasId);
        res.json({ message: "Canvas deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete canvas", details: error.message });
    }
};

exports.getUserCanvases = async (req, res) => {
    try {
        const userId = req.userId;

        const canvases = await Canvas.find({
            $or: [{ owner: userId }, { shared: userId }]
        }).sort({ createdAt: -1 });

        res.json(canvases);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch canvases", details: error.message });
    }
};