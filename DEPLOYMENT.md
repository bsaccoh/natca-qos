# NatCA CMS — Deployment Guide (100% Free Hosting)

This guide walks you through deploying the **NatCA CMS** project for free using **Neon** (PostgreSQL), **Render** (Backend API), and **Vercel** (Frontends).

---

## 🛠️ Summary of Free Architecture

| Service | Hosting | URL Example |
| :--- | :--- | :--- |
| **Database** | [Neon.tech](https://neon.tech) | `postgresql://user:pass@ep-xxx.neon.tech/neondb` |
| **Backend API** | [Render.com](https://render.com) | `https://natca-cms-backend.onrender.com` |
| **Citizen Portal** | [Vercel.com](https://vercel.com) | `https://natca-citizen.vercel.app` |
| **Admin Portal** | [Vercel.com](https://vercel.com) | `https://natca-admin.vercel.app` |

---

## Step 1: Create Free PostgreSQL Database (Neon)

1. Sign up at **[neon.tech](https://neon.tech)** (free, no credit card required).
2. Create a new project (e.g., `natca-cms`).
3. Under **Dashboard**, copy your **Connection String** (looks like `postgresql://alex:xyz@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`).

---

## Step 2: Deploy Backend to Render

1. Push your repository to **GitHub**.
2. Sign up at **[render.com](https://render.com)**.
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Configure the Web Service:
   - **Name**: `natca-cms-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Add **Environment Variables**:
   - `DATABASE_URL` = *(Your Neon connection string from Step 1)*
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = *(Generate any random 32+ character secret string)*
7. Click **Create Web Service**.
   - Render will build and run your backend.
   - Once live, copy your backend URL (e.g., `https://natca-cms-backend.onrender.com`).
   - *Note: The backend automatically creates all database tables and seeds the default admin account on startup.*

---

## Step 3: Deploy Citizen Portal to Vercel

1. Log in to **[vercel.com](https://vercel.com)**.
2. Click **Add New...** → **Project** → Import your GitHub repository.
3. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `citizen`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://natca-cms-backend.onrender.com/api/v1` *(Replace with your Render backend URL)*
5. Click **Deploy**.

---

## Step 4: Deploy Admin Portal to Vercel

1. In Vercel, click **Add New...** → **Project** → Import the same GitHub repository again.
2. Configure Project:
   - **Project Name**: `natca-admin`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `admin`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://natca-cms-backend.onrender.com/api/v1` *(Replace with your Render backend URL)*
4. Click **Deploy**.

---

## 🔑 Default Admin Login

Once deployed, log into your Admin Portal using:
- **Email**: `admin@natca.gov.sl`
- **Password**: `Admin@12345`

---

## 💡 Notes for Testing
- **Render Free Tier Cold Starts**: On Render's free tier, if no requests are received for 15 minutes, the backend goes to sleep. The first request after a sleep period will take about 20-30 seconds while the server wakes up. Subsequent requests will be instant.
- **Vercel Routing**: Single Page Application routing (reloads on routes like `/login` or `/track`) is automatically handled by the pre-configured `vercel.json` file in both `citizen` and `admin` folders.
