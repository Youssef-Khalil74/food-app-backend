

/**
 * GET /account/info
 * Retrieves account information.
 */
app.get("/account/info", authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT CustomerID, FirstName, LastName, Email, Country, CardInfo, Notifications 
             FROM Customer 
             WHERE CustomerID = ?`,
            [req.CustomerID] // CustomerID from JWT payload
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Customer not found." });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error("Account info error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});





/**
 * PUT /account/update-email
 * Changes email (must be unique).
 */
app.put("/account/update-email", authenticateToken, async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required." });
    }

    try {
        await pool.execute(
            `UPDATE Customer SET Email = ? WHERE CustomerID = ?`,
            [email, req.CustomerID]
        );
        res.json({ message: "Email updated successfully." });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "This email is already in use." });
        }
        console.error("Update email error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});




/**
 * PUT /account/update-password
 * Changes password (must be hashed).
 */
app.put("/account/update-password", authenticateToken, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) {
        return res.status(400).json({ message: "New password is required." });
    }

    try {
        // Hash the new password before storing it
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds); 
        await pool.execute(
            `UPDATE Customer SET Password = ? WHERE CustomerID = ?`,
            [hashedPassword, req.CustomerID]
        );
        res.json({ message: "Password updated successfully." });
    } catch (error) {
        console.error("Update password error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});





/**
 * PUT /account/update-name
 * Changes first and last name.
 */
app.put("/account/update-name", authenticateToken, async (req, res) => {
    const { firstName, lastName } = req.body;
    if (!firstName || !lastName) {
        return res.status(400).json({ message: "FirstName and LastName are required." });
    }

    try {
        await pool.execute(
            `UPDATE Customer SET FirstName = ?, LastName = ? WHERE CustomerID = ?`,
            [firstName, lastName, req.CustomerID]
        );
        res.json({ message: "Name updated successfully." });
    } catch (error) {
        console.error("Update name error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});





/**
 * PUT /account/update-country
 * Changes country.
 */
app.put("/account/update-country", authenticateToken, async (req, res) => {
    const { country } = req.body;
    if (!country) {
        return res.status(400).json({ message: "Country is required." });
    }

    try {
        await pool.execute(
            `UPDATE Customer SET Country = ? WHERE CustomerID = ?`,
            [country, req.CustomerID]
        );
        res.json({ message: "Country updated successfully." });
    } catch (error) {
        console.error("Update country error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});





/**
 * PUT /account/update-cardinfo
 * Changes card information.
 */
app.put("/account/update-cardinfo", authenticateToken, async (req, res) => {
    const { cardInfo } = req.body;
    
    try {
        await pool.execute(
            `UPDATE Customer SET CardInfo = ? WHERE CustomerID = ?`,
            [cardInfo || null, req.CustomerID] // Store null if cardInfo is empty
        );
        res.json({ message: "Card information updated successfully." });
    } catch (error) {
        console.error("Update card info error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});





/**
 * PUT /account/notifications
 * Toggles notification setting.
 */
app.put("/account/notifications", authenticateToken, async (req, res) => {
    const { notifications } = req.body;
    
    // Ensure notifications is a boolean (1 or 0 for MySQL BOOLEAN/TINYINT)
    const notificationStatus = notifications ? 1 : 0; 

    try {
        await pool.execute(
            `UPDATE Customer SET Notifications = ? WHERE CustomerID = ?`,
            [notificationStatus, req.CustomerID]
        );
        res.json({ message: `Notifications set to ${notifications ? 'ON' : 'OFF'}.` });
    } catch (error) {
        console.error("Update notifications error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});





/**
 * POST /logout
 * Logout is primarily a client-side action (deleting the JWT).
 */
app.post("/logout", (req, res) => {
    res.json({ message: "Logout successful. Please discard your token." });
});

