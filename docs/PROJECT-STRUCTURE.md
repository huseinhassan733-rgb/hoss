# HOSS Project Structure

## Application
- `src/main.jsx` — application shell and navigation.
- `src/modules/` — user-facing school modules.
- `src/services/` — business rules and shared services.
- `src/db.js` — local data store and accounting journal core.
- `src/styles.css` — mobile-first RTL interface.

## Delivery
- `public/` — PWA manifest and service worker.
- `capacitor.config.json` — Android/Capacitor configuration.
- `.github/workflows/build.yml` — web validation and Android APK build/release.

## Documentation
- `docs/` contains project structure, implementation status, and technical notes.

## Archive policy
Uploaded source bundles are not treated as active source code until their contents have been reviewed and integrated. This prevents duplicate or stale files from entering the production build.

## Development rule
Keep active code in `src/`. Keep business logic in services rather than duplicating accounting rules inside UI components. Preserve existing storage keys and data compatibility when changing the database layer.
