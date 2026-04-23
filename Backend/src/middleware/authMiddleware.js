const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
	const authHeader = req.headers.authorization || "";
	const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.headers["x-auth-token"];

	if (!token) {
		return res.status(401).json({ error: "Authentication token is required" });
	}

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET || "edusync-secret");
		req.user = payload;
		return next();
	} catch (error) {
		return res.status(401).json({ error: "Invalid or expired token" });
	}
};

const requireRole = (roles = []) => (req, res, next) => {
	if (!req.user) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	if (!roles.includes(req.user.role)) {
		return res.status(403).json({ error: "Access denied for this role" });
	}

	return next();
};

module.exports = { requireAuth, requireRole };