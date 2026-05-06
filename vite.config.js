// vite.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Vite build configuration for the rSpace Booking System.
// You generally don't need to change anything here unless you want to:
//   • Change the dev server port (server.port)
//   • Set a base path if deploying to a subfolder (base: '/subfolder/')
//   • Add plugins (e.g. legacy browser support)
// ─────────────────────────────────────────────────────────────────────────────

export default {
  // Base public path. Use '/' for root deployments.
  // Change to '/rspace/' if hosted at example.com/rspace/
  base: "/",

  server: {
    // Port for local development. Change if 5173 is already in use.
    port: 5173,
    open: true, // Automatically opens browser on `npm run dev`
  },

  build: {
    // Output directory for production build
    outDir: "dist",
    // Generate source maps for easier debugging in production
    sourcemap: false,
  },
};
