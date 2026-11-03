# Daily Expense Tracker

A full-stack app for tracking daily spending against a monthly budget. You enter your salary, EMIs, fixed bills and savings goal once a month. The app works out how much you can spend each day, and tells you how much is left today.

One repository, one deployable service: the Express server also serves the built React app.

## Features

- **Accounts.** Register and log in. Passwords are hashed with bcrypt, and sessions use a JWT in an httpOnly cookie (a Bearer token also works).
- **Monthly setup.** Salary, other income, loans and EMIs, fixed expenses and a savings goal (a fixed amount or a percentage of salary). "Copy from last month" starts a new month in one click.
- **Daily budget.** Money to spend = income − EMIs − fixed expenses − savings goal. The dashboard shows the daily budget and how much of today's budget is left, which adapts as the month goes on.
- **Expenses.** Add, edit and delete. Filter by date, category and payment method, search notes, sort and page through results. Expenses can repeat daily, weekly or monthly.
- **Categories.** Eleven built-in categories plus your own, each with an optional monthly limit. Deleting a category moves its expenses to "Other".
- **Dashboard.** Summary cards, a green/amber/red budget bar, spending by category, spending per day, a six-month trend, upcoming dues and warning banners.
- **Reports.** Monthly summary, top categories, category limits and CSV export for any date range.
- **Polish.** Dark mode, responsive layout, keyboard and screen reader support, loading, empty and error states, toasts and confirmation dialogs. Amounts are shown in ₹ with Indian digit grouping.

Edge cases that are handled: zero salary, negative balances, 28 to 31 day months, a loan due on the 31st in a short month, and deleting a category that still has expenses.

## Screenshots

_Add screenshots here after your first run, for example `docs/dashboard.png`._

## Tech stack

| Layer    | Tools                                                                                      |
| -------- | ------------------------------------------------------------------------------------------ |
| Frontend | React 18, Vite, Tailwind CSS, React Router, Chart.js (react-chartjs-2), Axios              |
| Backend  | Node 20, Express, zod, bcryptjs, jsonwebtoken, helmet, cors, express-rate-limit            |
| Database | PostgreSQL through `pg`, parameterized queries only                                        |
| Tooling  | ESLint, Prettier, nodemon, Jest and Supertest, GitHub Actions                              |

## Project layout

```
daily-expense-tracker/
  client/            React app (Vite). Builds to client/dist
  server/
    db/schema.sql    Database schema (safe to run repeatedly)
    src/             config, controllers, routes, validators, middleware, utils
    tests/           Jest and Supertest tests (run against a real Postgres)
    server.js        Entry point: migrate, start background jobs, listen
  render.yaml        Render Blueprint
  .github/workflows/ci.yml
  .env.example
```

## Run it locally

You need Node.js 20 or newer and PostgreSQL 14 or newer.

```bash
# 1. Create the databases (one for the app, one for tests)
createdb expense_tracker
createdb expense_tracker_test

# 2. Configure
cp .env.example .env
#    Edit .env: set DATABASE_URL, TEST_DATABASE_URL and a JWT_SECRET

# 3. Install and run
npm install
npm run install-all
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:5000, and Vite proxies `/api` to it. The schema is applied automatically when the server starts.

To run the production build locally, which is what Render does:

```bash
npm run build
NODE_ENV=production DATABASE_SSL=false npm start   # then open http://localhost:5000
```

(The production security headers ask browsers to use HTTPS, so on plain `http://localhost` some browsers will not load the assets. Use `npm run dev` locally, or test the production build on Render.)

Other commands: `npm run lint`, `npm run format`, `npm test`.

## Environment variables

| Name                | Required   | Description                                                                              |
| ------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | yes        | PostgreSQL connection string.                                                            |
| `JWT_SECRET`        | yes        | Secret for signing tokens. At least 16 characters, and at least 32 in production.        |
| `NODE_ENV`          | no         | `development`, `production` or `test`.                                                   |
| `PORT`              | no         | Server port. Default 5000. Render sets this for you.                                     |
| `CLIENT_URL`        | no         | Allowed CORS origins, comma separated. Not needed when the app and API share one origin. |
| `APP_TIMEZONE`      | no         | Decides what "today" is. Default `Asia/Kolkata`.                                         |
| `JWT_EXPIRES_DAYS`  | no         | Login lifetime in days.                                                                  |
| `DATABASE_SSL`      | no         | Set to `false` to turn off SSL in production (for a local database).                     |
| `TEST_DATABASE_URL` | tests only | A separate database for `npm test`. Tests delete every user in it.                       |

## API

Every response has the shape `{ "success": true|false, "data": ..., "message": "..." }`. Everything except `/api/auth/*` and `/health` needs a login. Months are `YYYY-MM` and dates are `YYYY-MM-DD`.

| Method and path                                | What it does                                              |
| ---------------------------------------------- | --------------------------------------------------------- |
| `GET /health`                                  | Health check, including the database                      |
| `POST /api/auth/register`                      | Create an account and log in                              |
| `POST /api/auth/login`                         | Log in                                                    |
| `POST /api/auth/logout`                        | Log out                                                   |
| `GET /api/auth/me`                             | The logged-in user                                        |
| `GET /api/budgets/:month`                      | Month setup with loans, fixed expenses and totals         |
| `POST /api/budgets/:month`                     | Create a month's budget                                   |
| `PUT /api/budgets/:month`                      | Update income and savings goal                            |
| `POST /api/budgets/:month/copy-from/:prevMonth` | Copy setup from another month                            |
| `GET, POST /api/loans`                         | List (with `?month=`) and add loans                       |
| `PUT, DELETE /api/loans/:id`                   | Edit and delete a loan                                    |
| `GET, POST /api/fixed-expenses`                | List (with `?month=`) and add fixed expenses              |
| `PUT, DELETE /api/fixed-expenses/:id`          | Edit and delete a fixed expense                           |
| `GET, POST /api/expenses`                      | List (filters, search, sort, paging) and add expenses     |
| `GET, PUT, DELETE /api/expenses/:id`           | Read, edit and delete an expense                          |
| `GET /api/recurring`                           | List repeating expenses                                   |
| `PATCH, DELETE /api/recurring/:id`             | Pause, resume or delete a repeating expense               |
| `GET, POST /api/categories`                    | List and add categories                                   |
| `PUT, DELETE /api/categories/:id`              | Edit and delete a category                                |
| `GET /api/summary/:month`                      | Everything the dashboard and reports need                 |
| `GET /api/reports/trend?months=6`              | Month-by-month trend                                      |
| `GET /api/export/csv?from=&to=`                | CSV download                                              |

## How the money is handled

Amounts are stored as `NUMERIC(12,2)`, never floating point. All arithmetic runs on whole paise on the server, so totals are exact. Dates are plain strings with no timezone shifting.

## Deploy to Render

See the commands in the step-by-step guide that comes with this project. In short:

1. Push the repository to GitHub.
2. In Render, choose **New**, then **Blueprint**, and select the repository. Render reads `render.yaml` and creates the web service and the database.
3. After the first deploy, open the service URL. The first start applies the database schema.

Free tier limits:

- The web service **sleeps after about 15 minutes without traffic**. The first request afterwards takes up to a minute.
- The free Postgres database **expires after a limited period** (currently 30 days). Export your data from the Reports page, then create a new database or upgrade the plan before it expires.

## Future improvements

- Password reset by email
- Budgets shared between family members
- Receipt photos on expenses
- Installable app with offline entry
- Bank statement import
- Multi-currency support

## License

MIT
