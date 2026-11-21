# Repository Guidelines

## Stack

ShopLedger uses Node.js with Express 4 and body-parser. The browser UI is plain HTML, CSS, and JavaScript. Application data is stored in `data/db.json`.

## Module Map

- `server.js` creates the Express app and mounts static files and API routes.
- `routes/` contains the products, orders, customers, and reports endpoints.
- `lib/` contains pricing, tax, coupons, inventory, orders, ledger, invoices, reports, date utilities, and JSON storage.
- `public/` contains the UI; `config.js` contains shop details and business settings; `data/db.json` contains application records.

## Commands

- `npm start` starts the app (`PORT` overrides the default port 3000).
- `npm test` is a placeholder that exits with “no test specified”; there is no configured test suite.

## Change Rules

- Before changing behavior, write characterization tests that capture the current behavior.
- Change only the module the ticket is about. Avoid unrelated cleanup or edits in other modules.
- Tests must never read from or write to `data/db.json`; use isolated test data.
- Add no dependencies. Do not add packages to `package.json` or the lockfile.
