const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Voucher = require("../models/Voucher");
const Event = require("../models/Event");
const queueService = require("../services/queueService");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

const getUserFromToken = (req) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  const decoded = getUserFromToken(req);
  if (!decoded) {
    return res.status(401).json({
      message: "Authentication required",
      code: "AUTH_REQUIRED",
    });
  }
  req.user = decoded;
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "Admin access required",
      code: "ADMIN_REQUIRED",
    });
  }
  next();
};

/**
 * @swagger
 * /api/vouchers:
 *   get:
 *     summary: Get all vouchers with filters
 *     tags: [Vouchers]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of vouchers to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of vouchers to skip
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter by event ID
 *       - in: query
 *         name: issuedTo
 *         schema:
 *           type: string
 *         description: Filter by issued to user
 *       - in: query
 *         name: isUsed
 *         schema:
 *           type: boolean
 *         description: Filter by usage status
 *     responses:
 *       200:
 *         description: List of vouchers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Voucher'
 */
router.get("/", async (req, res) => {
  try {
    const { limit = 20, offset = 0, eventId, issuedTo, isUsed } = req.query;
    let query = {};

    if (eventId) query.eventId = eventId;
    if (issuedTo) query.issuedTo = issuedTo;
    if (isUsed !== undefined) query.isUsed = isUsed === "true";

    const vouchers = await Voucher.find(query)
      .populate("eventId")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    res.json(vouchers);
  } catch (error) {
    res.status(500).json({
      message: `Failed to fetch vouchers: ${error.message}`,
      code: "FETCH_VOUCHERS_FAILED",
    });
  }
});

/**
 * @swagger
 * /api/vouchers/{id}:
 *   get:
 *     summary: Get voucher by ID
 *     tags: [Vouchers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Voucher ID
 *     responses:
 *       200:
 *         description: Voucher details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       404:
 *         description: Voucher not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid voucher ID",
        code: "INVALID_VOUCHER_ID",
      });
    }

    const voucher = await Voucher.findById(req.params.id).populate("eventId");
    if (!voucher) {
      return res.status(404).json({
        message: "Voucher not found",
        code: "VOUCHER_NOT_FOUND",
      });
    }

    res.json(voucher);
  } catch (error) {
    res.status(500).json({
      message: `Failed to fetch voucher: ${error.message}`,
      code: "FETCH_VOUCHER_FAILED",
    });
  }
});

/**
 * @swagger
 * /api/vouchers/code/{code}:
 *   get:
 *     summary: Get voucher by code
 *     tags: [Vouchers]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Voucher code
 *     responses:
 *       200:
 *         description: Voucher details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       404:
 *         description: Voucher not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/code/:code", async (req, res) => {
  try {
    const voucher = await Voucher.findOne({
      code: req.params.code.toUpperCase(),
    }).populate("eventId");
    if (!voucher) {
      return res.status(404).json({
        message: "Voucher not found",
        code: "VOUCHER_NOT_FOUND",
      });
    }

    res.json(voucher);
  } catch (error) {
    res.status(500).json({
      message: `Failed to fetch voucher: ${error.message}`,
      code: "FETCH_VOUCHER_FAILED",
    });
  }
});

/**
 * @swagger
 * /api/vouchers:
 *   post:
 *     summary: Create a new voucher (Admin only)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - code
 *               - issuedTo
 *             properties:
 *               eventId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               code:
 *                 type: string
 *                 example: VOUCHER-1234567890-ABC123DEF
 *               issuedTo:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: Voucher created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { eventId, code, issuedTo } = req.body;

    // Check if voucher code already exists
    const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
    if (existingVoucher) {
      return res.status(400).json({
        message: "Voucher code already exists",
        code: "VOUCHER_CODE_EXISTS",
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(400).json({
        message: "Event not found",
        code: "EVENT_NOT_FOUND",
      });
    }

    const voucher = new Voucher({
      eventId,
      code: code.toUpperCase(),
      issuedTo,
      isUsed: false,
    });

    const saved = await voucher.save();
    const populatedVoucher = await Voucher.findById(saved._id).populate(
      "eventId"
    );

    res.status(201).json(populatedVoucher);
  } catch (error) {
    res.status(400).json({
      message: `Voucher creation failed: ${error.message}`,
      code: "VOUCHER_CREATION_FAILED",
    });
  }
});

/**
 * @swagger
 * /api/vouchers/issue:
 *   post:
 *     summary: Issue voucher to user (Admin only)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - issuedTo
 *             properties:
 *               eventId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               issuedTo:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: Voucher issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/issue", requireAuth, requireAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  let event, voucher, eventDoc, voucherDoc;
  const { eventId, issuedTo } = req.body;

  try {
    session.startTransaction();

    // Check if event exists
    eventDoc = await Event.findById(eventId).session(session);
    if (!eventDoc) {
      throw new Error("EVENT_NOT_FOUND");
    }

    // Check if event has available quantity
    if (eventDoc.issuedCount >= eventDoc.maxQuantity) {
      throw new Error("EVENT_FULL");
    }

    // Generate unique voucher code
    const voucherCode = `VOUCHER-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    voucherDoc = new Voucher({
      eventId,
      code: voucherCode,
      issuedTo,
      isUsed: false,
    });

    voucher = await voucherDoc.save({ session });

    // Update event issued count
    event = await Event.findByIdAndUpdate(
      eventId,
      { $inc: { issuedCount: 1 } },
      { session, new: true }
    );

    await session.commitTransaction();

    try {
      await queueService.addVoucherEmailJob({
        email: issuedTo,
        name: issuedTo,
        voucherCode: voucherDoc.code,
        eventName: event.name,
        eventDescription: event.description,
      });
    } catch (emailErr) {
      console.error("❌ Failed to queue voucher email:", emailErr);
    }

    const populatedVoucher = await Voucher.findById(voucher._id).populate(
      "eventId"
    );

    res.status(201).json(populatedVoucher);
  } catch (error) {
    console.error("❌ Voucher issuance error:", error);
    try {
      await session.abortTransaction();
    } catch (abortErr) {
      console.error("❌ Failed to abort transaction:", abortErr);
    }

    let code = "VOUCHER_ISSUANCE_FAILED";
    if (error.message === "EVENT_NOT_FOUND") code = error.message;
    if (error.message === "EVENT_FULL") code = error.message;

    res.status(400).json({
      message: `Voucher issuance failed: ${error.message}`,
      code,
    });
  } finally {
    session.endSession();
  }
});

/**
 * @swagger
 * /api/vouchers/{id}/use:
 *   post:
 *     summary: Mark voucher as used
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Voucher ID
 *     responses:
 *       200:
 *         description: Voucher marked as used
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       400:
 *         description: Voucher already used
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Voucher not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:id/use", requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid voucher ID",
        code: "INVALID_VOUCHER_ID",
      });
    }

    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({
        message: "Voucher not found",
        code: "VOUCHER_NOT_FOUND",
      });
    }

    if (voucher.isUsed) {
      return res.status(400).json({
        message: "Voucher has already been used",
        code: "VOUCHER_ALREADY_USED",
      });
    }

    const updatedVoucher = await Voucher.findByIdAndUpdate(
      req.params.id,
      { isUsed: true, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate("eventId");

    res.json(updatedVoucher);
  } catch (error) {
    res.status(500).json({
      message: `Voucher usage failed: ${error.message}`,
      code: "VOUCHER_USAGE_FAILED",
    });
  }
});

module.exports = router;
