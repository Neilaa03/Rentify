import 'dotenv/config';
import app from './app.js';
import { initSocket } from './src/socket/index.js';
import { startEscrowAutoReleaseScheduler } from './src/modules/payments/escrowScheduler.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Initialize Socket.IO for real-time features
initSocket(server);
startEscrowAutoReleaseScheduler();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
