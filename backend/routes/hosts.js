const express = require("express");
const { pool } = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Host applies with their bank details.
router.post("/apply", authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      phone,
      idType,
      idNumber,
      organization,
      experience,
      bio,
      account_holder_name,
      account_number,
      ifsc_code,
      bank_name,
      account_type,
    } = req.body;
    const user_id = req.user.id;

    if (
      !phone ||
      !idType ||
      !idNumber ||
      !account_holder_name ||
      !account_number ||
      !ifsc_code ||
      !bank_name
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "All personal and bank account fields are required",
      });
    }

    const userCheck = await client.query(
      "SELECT host_status FROM users WHERE id = $1",
      [user_id]
    );
    const currentStatus = userCheck.rows[0].host_status;

    if (currentStatus === "approved") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "You are already an approved host" });
    }
    if (currentStatus === "pending") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Your application is already pending" });
    }

    const hostData = {
      personal: { phone, idType, idNumber, organization, experience, bio },
      bank: {
        account_holder_name,
        account_number,
        ifsc_code,
        bank_name,
        account_type: account_type || "savings",
        verified: false,
        payout_eligible: false,
      },
      appliedAt: new Date().toISOString(),
    };

    await client.query(
      `UPDATE users 
       SET is_host = true, host_status = 'pending', host_verification_data = $1 
       WHERE id = $2`,
      [hostData, user_id]
    );

    const existingAccount = await client.query(
      "SELECT id FROM host_bank_accounts WHERE user_id = $1",
      [user_id]
    );

    if (existingAccount.rows.length > 0) {
      await client.query(
        `UPDATE host_bank_accounts 
         SET account_holder_name = $1, account_number = $2, ifsc_code = $3, 
             bank_name = $4, account_type = $5, is_verified = false, 
             is_payout_eligible = false, updated_at = NOW()
         WHERE user_id = $6`,
        [
          account_holder_name,
          account_number,
          ifsc_code,
          bank_name,
          account_type || "savings",
          user_id,
        ]
      );
    } else {
      await client.query(
        `INSERT INTO host_bank_accounts (
           user_id, account_holder_name, account_number, ifsc_code, 
           bank_name, account_type, is_verified, is_payout_eligible
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user_id,
          account_holder_name,
          account_number,
          ifsc_code,
          bank_name,
          account_type || "savings",
          false,
          false,
        ]
      );
    }

    await client.query("COMMIT");
    res.json({
      message: "Host application submitted! It is now pending admin review.",
      application: hostData,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Host application error:", error);
    res.status(500).json({ error: "Failed to submit host application" });
  } finally {
    client.release();
  }
});

// List of events eligible for payout generation.
router.get(
  "/admin/payable-events",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const queryText = `
        SELECT 
          e.id, 
          e.title as event_title, 
          e.created_by as host_id, 
          u.name as host_name,
          SUM(b.total_amount) AS total_revenue,
          COUNT(b.id) AS total_bookings_count
        FROM events e
        JOIN users u ON e.created_by = u.id
        JOIN bookings b ON e.id = b.event_id
        LEFT JOIN payouts p ON e.id = p.event_id
        WHERE 
          e.date_time < NOW()
          AND e.approval_status = 'approved'
          AND b.status = 'confirmed'
          AND p.id IS NULL
        GROUP BY e.id, u.name
        ORDER BY e.date_time ASC;
      `;

      const result = await pool.query(queryText);
      res.json({ events: result.rows });
    } catch (error) {
      console.error("Failed to fetch payable events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Host creates a payout.
router.post(
  "/payouts/create",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { event_id, host_id, amount, notes } = req.body;

      if (!event_id || !host_id || !amount) {
        return res.status(400).json({
          success: false,
          error: "Event ID, host ID, and amount are required",
        });
      }

      const hostAccount = await pool.query(
        `SELECT * FROM host_bank_accounts
         WHERE user_id = $1 AND is_payout_eligible = true`,
        [host_id]
      );

      if (hostAccount.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "Host is not eligible for payouts. Admin must approve their bank account first.",
        });
      }

      const hostShare = parseFloat(amount);
      const simulatedPayoutId = "sim_payout_event_" + Date.now();
      const payoutNotes = notes || "Payout processed by admin.";

      const payoutRecord = await pool.query(
        `INSERT INTO payouts (host_id, event_id, amount, razorpay_payout_id, status, processed_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          host_id,
          event_id,
          hostShare,
          simulatedPayoutId,
          "processed",
          new Date(),
          payoutNotes,
        ]
      );

      res.json({
        success: true,
        message: "Payout initiated successfully! (Simulated)",
        payout: payoutRecord.rows[0],
      });
    } catch (error) {
      console.error("❌ Payout creation error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create simulated payout",
      });
    }
  }
);

// Fetch all payouts generated.
router.get(
  "/admin/payouts",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { status, host_id } = req.query;
      let query = `
   SELECT p.*, u.name as host_name, u.email as host_email,
          e.title as event_title, e.image_url, e.category
   FROM payouts p
       JOIN users u ON p.host_id = u.id
       LEFT JOIN events e ON p.event_id = e.id
       WHERE 1=1
     `;
      const params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND p.status = $${paramCount}`;
        params.push(status);
      }
      if (host_id) {
        paramCount++;
        query += ` AND p.host_id = $${paramCount}`;
        params.push(host_id);
      }
      query += ` ORDER BY p.created_at DESC`;
      const result = await pool.query(query, params);
      res.json({
        payouts: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error("Get admin payouts error:", error);
      res.status(500).json({ error: "Failed to get payouts" });
    }
  }
);

// Fetches all the payouts issued in the name of the user.
router.get("/my-payouts", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const result = await pool.query(
      `SELECT p.*, e.title as event_title, e.image_url, e.category
   FROM payouts p
   LEFT JOIN events e ON p.event_id = e.id
   WHERE p.host_id = $1
   ORDER BY p.created_at DESC`,
      [user_id]
    );
    res.json({
      payouts: result.rows,
      total_amount: result.rows.reduce(
        (sum, p) => sum + parseFloat(p.amount),
        0
      ),
    });
  } catch (error) {
    console.error("Get my payouts error:", error);
    res.status(500).json({ error: "Failed to get your payouts" });
  }
});

router.get("/my-status", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const result = await pool.query(
      "SELECT id, email, name, role, is_host, host_status, host_verification_data FROM users WHERE id = $1",
      [user_id]
    );
    res.json({
      hostStatus: result.rows[0],
    });
  } catch (error) {
    console.error("Get host status error:", error);
    res.status(500).json({ error: "Failed to get host status" });
  }
});

// Fetches all the pending hosts' applications.
router.get(
  "/applications/pending",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, email, name, host_verification_data, created_at 
       FROM users 
       WHERE host_status = 'pending' 
       ORDER BY created_at DESC`
      );
      res.json({
        applications: result.rows,
      });
    } catch (error) {
      console.error("Get pending applications error:", error);
      res.status(500).json({ error: "Failed to get pending applications" });
    }
  }
);

// Returns all the approved hosts'.
router.get(
  "/admin/approved",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, email, name, host_verification_data, created_at 
       FROM users 
       WHERE host_status = 'approved' 
       ORDER BY created_at DESC`
      );
      res.json({ applications: result.rows });
    } catch (error) {
      console.error("Get approved hosts error:", error);
      res.status(500).json({ error: "Failed to get approved hosts" });
    }
  }
);

// Returns all the rejected hosts' applications.
router.get(
  "/admin/rejected",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, email, name, host_verification_data, created_at 
       FROM users 
       WHERE host_status = 'rejected' 
       ORDER BY created_at DESC`
      );
      res.json({ applications: result.rows });
    } catch (error) {
      console.error("Get rejected hosts error:", error);
      res.status(500).json({ error: "Failed to get rejected hosts" });
    }
  }
);

// Admin reviews host applications.
router.post(
  "/applications/:userId/review",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { userId } = req.params;
      const { action, adminNotes } = req.body;

      if (!["approve", "reject"].includes(action)) {
        return res
          .status(400)
          .json({ error: "Action must be 'approve' or 'reject'" });
      }

      const newStatus = action === "approve" ? "approved" : "rejected";

      const currentData = await client.query(
        "SELECT host_verification_data FROM users WHERE id = $1",
        [userId]
      );
      const currentVerificationData =
        currentData.rows[0]?.host_verification_data || {};

      const updatedVerificationData = {
        ...currentVerificationData,
        adminNotes: adminNotes || "",
        reviewedAt: new Date().toISOString(),
      };

      await client.query(
        `UPDATE users 
       SET host_status = $1, 
           host_verification_data = $2
       WHERE id = $3`,
        [newStatus, updatedVerificationData, userId]
      );

      if (action === "approve") {
        await client.query(
          `UPDATE host_bank_accounts
             SET is_verified = true, is_payout_eligible = true
             WHERE user_id = $1`,
          [userId]
        );
      }

      await client.query("COMMIT");
      res.json({
        message: `Host application ${action}d successfully!`,
        status: newStatus,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Review host application error:", error);
      res.status(500).json({ error: "Failed to review host application" });
    } finally {
      client.release();
    }
  }
);

// Host can fetch their bank account details.
router.get("/bank-account", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const result = await pool.query(
      `SELECT 
         account_holder_name, account_number, ifsc_code, bank_name, 
         account_type, is_verified, is_payout_eligible,
         created_at, updated_at
       FROM host_bank_accounts 
       WHERE user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.json({ bank_account: null });
    }

    const bankAccount = result.rows[0];

    res.json({
      bank_account: {
        ...bankAccount,
        account_number: `****${bankAccount.account_number.slice(-4)}`,
      },
    });
  } catch (error) {
    console.error("Get bank account error:", error);
    res.status(500).json({ error: "Failed to get bank account details" });
  }
});

module.exports = router;
