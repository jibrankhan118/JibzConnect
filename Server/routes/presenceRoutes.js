const express = require("express");
const { getAllPresence, getPresenceByUser, getLastSeen } = require("../controllers/presenceController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

if (false) {
const UserPresence = require("../models/UserPresence");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// GET all users with presence info
router.get("/", async (req, res) => {
  try {
    const presences = await UserPresence.findAll({
      include: [{ model: User, attributes: ["id", "username"] }],
    });
    res.json(presences);
  } catch (error) {
    res.status(500).json({ message: "Error fetching presence" });
  }
});

// GET presence for specific user
router.get("/:userId", async (req, res) => {
  try {
    const presence = await UserPresence.findOne({
      where: { userId: req.params.userId },
      include: [{ model: User, attributes: ["id", "username"] }],
    });
    if (!presence) return res.status(404).json({ message: "User not found" });
    res.json(presence);
  } catch (error) {
    res.status(500).json({ message: "Error fetching presence" });
  }
});

// GET last seen time
router.get("/:userId/last-seen", async (req, res) => {
  try {
    const presence = await UserPresence.findOne({
      where: { userId: req.params.userId },
    });
    if (!presence) return res.status(404).json({ message: "User not found" });
    res.json({ userId: req.params.userId, lastSeen: presence.lastSeen });
  } catch (error) {
    res.status(500).json({ message: "Error fetching last seen" });
  }
});

}

router.use(authMiddleware);
router.get("/", getAllPresence);
router.get("/:userId", getPresenceByUser);
router.get("/:userId/last-seen", getLastSeen);

module.exports = router;
