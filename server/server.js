require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Bootstraps CloudPublish backend server
 */
async function startServer() {
  try {
    // 1. Establish MongoDB connection first
    await connectDB();

    // 2. Start Express server only after successful database connection
    const server = app.listen(PORT, () => {
      console.log(`[CloudPublish] Server running in ${NODE_ENV} mode on port ${PORT}`);
    });

    // 3. Handle Graceful Shutdown
    const handleShutdown = async (signal) => {
      console.log(`\n[CloudPublish] ${signal} signal received. Closing HTTP server...`);
      server.close(async () => {
        console.log('[CloudPublish] HTTP server closed.');
        try {
          await disconnectDB();
          console.log('[CloudPublish] Process terminated gracefully.');
          process.exit(0);
        } catch (err) {
          console.error('[CloudPublish] Error during database disconnect:', err.message);
          process.exit(1);
        }
      });

      // Force exit if hanging beyond 10 seconds
      setTimeout(() => {
        console.error('[CloudPublish] Shutdown timeout exceeded. Forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    return server;
  } catch (error) {
    console.error(`[CloudPublish] Server failed to start: ${error.message}`);
    process.exit(1);
  }
}

// Start server if invoked directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer, app };
