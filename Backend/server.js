require("dotenv").config();
const app = require("./src/app");
const { connectDB } = require("./src/db/db");

const PORT = Number(process.env.PORT || 3000);

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server started on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();