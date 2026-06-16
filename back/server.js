import 'dotenv/config';
import app from './app.js';
import { initSocket } from './src/socket/index.js';

// Load env from back/.env even when starting from repo root.
dotenv.config({ path: new URL('./.env', import.meta.url) });

const { default: app } = await import('./app.js');
const { initSocket } = await import('./src/socket/index.js');
const { startEscrowAutoReleaseScheduler } = await import('./src/modules/escrow/escrowScheduler.js');
const { assistantProvider } = await import('./src/modules/assistant/assistantService.js');
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`AI assistant provider: ${assistantProvider}`);
    if (assistantProvider === 'gemini') console.log(`Gemini model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
    if (assistantProvider === 'openai') console.log(`OpenAI model: ${process.env.OPENAI_MODEL || 'gpt-5'}`);
});

// Initialize Socket.IO for real-time features
initSocket(server);

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
