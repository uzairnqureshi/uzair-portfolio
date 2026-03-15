# 🚀 Uzair Qureshi — Portfolio (Full Stack)

A GenZ-aesthetic portfolio site with an **Express.js backend**, **SQLite database**, contact form storage, visitor tracking, and an admin dashboard.

---

## Stack

| Layer      | Tech                              |
|------------|-----------------------------------|
| Frontend   | Vanilla HTML/CSS/JS               |
| Backend    | Node.js + Express                 |
| Database   | SQLite (via better-sqlite3)       |
| Security   | Helmet, CORS, rate-limiting       |
| Email      | Nodemailer (optional)             |

---

## Project Structure

```
uzair-portfolio/
├── server.js           ← Express app & all API routes
├── database.js         ← SQLite setup & prepared statements
├── package.json
├── .env.example        ← copy to .env and fill in
├── .gitignore
├── data/               ← auto-created; holds portfolio.db
└── public/
    ├── index.html      ← the portfolio site
    └── admin.html      ← admin dashboard
```

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Open .env and set ADMIN_KEY to something secret

# 3. Run the server
npm run dev        # hot-reload with nodemon
# or
npm start          # production mode

# 4. Open your browser
# Portfolio → http://localhost:3000
# Admin     → http://localhost:3000/admin.html
```

---

## API Endpoints

### Public
| Method | Route          | Description                   |
|--------|----------------|-------------------------------|
| POST   | `/api/contact` | Submit a contact form message |
| GET    | `/api/health`  | Health check                  |

### Admin (requires `x-admin-key` header or `?key=` query param)
| Method | Route                              | Description                |
|--------|------------------------------------|----------------------------|
| GET    | `/api/admin/messages`              | List all messages          |
| POST   | `/api/admin/messages/:id/read`     | Mark one message as read   |
| POST   | `/api/admin/messages/read-all`     | Mark all messages as read  |
| DELETE | `/api/admin/messages/:id`          | Delete a message           |
| GET    | `/api/admin/stats`                 | Visitor & message stats    |

---

## Deployment

### Option A — Railway (Recommended, free tier available)

1. Push the project to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the repo
4. In **Variables**, add:
   - `ADMIN_KEY` = a long random secret
   - `PORT` = (Railway sets this automatically; leave blank)
5. Railway auto-detects Node.js and runs `npm start`
6. Done — Railway gives you a public URL like `https://uzair-portfolio.up.railway.app`

### Option B — Render (Free tier available)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect the repo
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add environment variables: `ADMIN_KEY`, etc.
7. Deploy!

### Option C — VPS / DigitalOcean

```bash
# On your server (Ubuntu 22.04):
git clone https://github.com/yourname/uzair-portfolio.git
cd uzair-portfolio
npm install --production
cp .env.example .env && nano .env  # set your values

# Install PM2 for process management
npm install -g pm2
pm2 start server.js --name portfolio
pm2 save
pm2 startup

# Reverse proxy with nginx
# Point your domain to the server and proxy :3000
```

---

## Environment Variables

| Variable         | Required | Description                                 |
|------------------|----------|---------------------------------------------|
| `PORT`           | No       | Port number (default: 3000)                 |
| `ADMIN_KEY`      | Yes      | Secret key for admin panel access           |
| `ALLOWED_ORIGIN` | No       | CORS origin (default: `*`)                  |
| `SMTP_HOST`      | No       | SMTP server for email notifications         |
| `SMTP_PORT`      | No       | SMTP port (default: 587)                    |
| `SMTP_SECURE`    | No       | Use TLS (default: false)                    |
| `SMTP_USER`      | No       | SMTP username / email                       |
| `SMTP_PASS`      | No       | SMTP password or App Password               |
| `NOTIFY_EMAIL`   | No       | Where to send notification emails           |

> **Generate a strong admin key:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## Admin Dashboard

Visit `/admin.html` and enter your `ADMIN_KEY`.  
You'll see:
- 📊 Visitor stats (total, unique IPs, last 24h, last 7 days)
- 📨 All contact messages with **NEW** badge for unread ones
- Mark as read / delete individual messages
- Mark all as read at once

---

## Custom Domain

After deploying to Railway or Render, go to **Settings → Custom Domain** and add your domain. Then update your DNS records as instructed.

---

## Email Notifications (Optional)

If you want an email every time someone fills out the contact form:

**Gmail:**
1. Enable 2FA on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an App Password
4. Set in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your@gmail.com
   SMTP_PASS=your_16char_app_password
   NOTIFY_EMAIL=uzair@yourdomain.com
   ```

Messages are **always saved to SQLite regardless** of whether email is configured.

---

Built with 💚 & too much caffeine.
