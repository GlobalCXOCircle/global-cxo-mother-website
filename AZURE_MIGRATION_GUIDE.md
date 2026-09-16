# Azure Cloud Migration & Connection Guide

This guide details the step-by-step process for deploying both the **Backend API** (`global-cxo-backend`) and **Frontend Website** (`global-cxo-mother-website`) to Microsoft Azure Cloud, and connecting them seamlessly.

---

## System Architecture Overview

```
 ┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
 │           Frontend Website           │       │             Backend API              │
 │    (global-cxo-mother-website)       │ ────> │        (global-cxo-backend)          │
 │                                      │  REST │                                      │
 │ Azure App Service / Static Web Apps  │  APIs │    Azure App Service (Node 22 LTS)   │
 └──────────────────────────────────────┘       └──────────────────┬───────────────────┘
                                                                   │
                                                                   ▼
                                                        ┌─────────────────────┐
                                                        │   Neon PostgreSQL   │
                                                        │  Database (External) │
                                                        └─────────────────────┘
```

---

## Part 1: Backend Deployment to Azure App Service (`global-cxo-backend`)

### Step 1: Create the Backend Azure App Service

1. Log into the **[Azure Portal](https://portal.azure.com)**.
2. Click **Create a resource** > **Web App**.
3. Fill in the **Basics** tab:
   - **Subscription**: Select your active Azure subscription.
   - **Resource Group**: Select your resource group (e.g., `rg-gcxo-prod-eastus`).
   - **Name**: Choose a unique backend app name (e.g., `gcio-backend-prod`).
     *Resulting URL will be: `https://gcio-backend-prod.azurewebsites.net`*
   - **Publish**: `Code`
   - **Runtime stack**: `Node 22 LTS`
   - **Operating System**: `Linux`
   - **Region**: `East US` (or nearest region).
   - **Pricing Plan**: Select `Basic B1` or `Standard S1`.

4. **Bypass Role Assignment Error**:
   - In the **Deployment** tab, set **Continuous deployment** to **Disabled**.
   - In the **Identity** tab, ensure **System assigned identity** is set to **Off**.
   - In the **Database** tab, set to **None**.
   - In the **Monitoring** tab, set **Enable Application Insights** to **No**.
5. Click **Review + Create**, then click **Create**.

---

### Step 2: Configure Backend Environment Variables

Once your backend App Service is created:

1. Go to your backend App Service resource > **Settings** > **Environment variables**.
2. Add the following **App settings**:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Set Node environment to production |
| `PORT` | `8080` | Port for Express server to listen on |
| `DATABASE_URL` | `postgresql://user:password@neon-db-host/dbname` | Connection string to Neon PostgreSQL |
| `CORS_ORIGIN` | `https://globalcxocircle.com,https://<your-frontend-app>.azurewebsites.net` | Allowed frontend origins for CORS |
| `JWT_SECRET` | `<your-secure-jwt-secret>` | Authentication token signing secret |

3. Click **Apply** at the bottom to save environment variables.

---

### Step 3: Configure Startup Command & CORS

1. Go to **Settings** > **Configuration** > **General settings**.
2. **Startup Command**:
   ```bash
   npm start
   ```
   *(Ensure `package.json` in `global-cxo-backend` has a `"start": "node server.js"` or `"start": "node index.js"` script).*

3. **CORS Settings**:
   - Go to **API** > **CORS** in the left sidebar.
   - Add your frontend domain URLs (e.g., `https://<your-frontend-app-name>.azurewebsites.net` and `https://globalcxocircle.com`).
   - Enable **Enable Access-Control-Allow-Credentials**.

---

### Step 4: Deploy Backend Code to Azure

#### Method A: Using Deployment Center (Publish Profile)
1. In Azure Portal, go to **Deployment** > **Deployment Center**.
2. Select **Source**: `GitHub`.
3. Select authentication type: **Publish Profile** (Avoids RBAC role assignment issues).
4. Select Organization, Repository (`global-cxo-backend`), and Branch (`main`).
5. Click **Save**. Azure will automatically create a GitHub Action workflow to build and deploy your backend.

#### Method B: Using Azure CLI
In your `global-cxo-backend` local repository root:
```bash
az webapp up --name gcio-backend-prod --resource-group rg-gcxo-prod-eastus --runtime "NODE:22-lts"
```

---

## Part 2: Frontend Setup & Connection (`global-cxo-mother-website`)

### Step 1: Update Frontend API Base URL Environment Variables

In your frontend codebase, update `.env.local` (and your deployment environment settings in Azure/Vercel):

```env
NEXT_PUBLIC_API_BASE_URL=https://<your-backend-app-name>.azurewebsites.net/api
NEXT_PUBLIC_USE_API_AUTH=true
```

*(Replace `<your-backend-app-name>` with your actual Azure backend App Service name, e.g., `gcio-backend-prod.azurewebsites.net`).*

The frontend API configuration ([`src/portal/api/config.ts`](file:///c:/Users/himan/Desktop/global-cxo-mother-website/src/portal/api/config.ts)) automatically reads `NEXT_PUBLIC_API_BASE_URL` at build/runtime.

---

### Step 2: Deploy Frontend to Azure App Service

1. Create a second Azure App Service for the frontend:
   - **Name**: `global-cxo-mother-website` (or similar)
   - **Runtime stack**: `Node 22 LTS` (OS: `Linux`)
   - **Continuous deployment**: `Disabled` (to prevent RBAC errors)

2. **Configure Environment Variables**:
   In Azure Portal > Frontend App Service > **Environment variables**:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://<your-backend-app-name>.azurewebsites.net/api`
   - `NEXT_PUBLIC_USE_API_AUTH` = `true`

3. **Configure Startup Command**:
   Since Next.js is configured with `output: 'export'` in [`next.config.ts`](file:///c:/Users/himan/Desktop/global-cxo-mother-website/next.config.ts), set **Startup Command** under **Configuration** > **General settings**:
   ```bash
   npx serve -s out -l 8080
   ```

4. **Deploy Frontend Code**:
   Use **Deployment Center** with **Publish Profile** or run Azure CLI:
   ```bash
   az webapp up --name global-cxo-mother-website --resource-group rg-gcxo-prod-eastus
   ```

---

## Part 3: Verification & Connection Testing Checklist

Once both services are deployed, perform the following verification steps:

1. **Test Backend Health Endpoint**:
   Open browser or run terminal curl:
   ```bash
   curl -i https://<your-backend-app-name>.azurewebsites.net/api
   ```
   *Expected Result*: HTTP `200 OK` or API health JSON response.

2. **Test Frontend-to-Backend CORS & API Requests**:
   - Open your frontend Azure URL (`https://<your-frontend-app-name>.azurewebsites.net`).
   - Open Browser Developer Tools (`F12` > **Network** tab).
   - Test user login or waitlist submission form.
   - Verify that requests target `https://<your-backend-app-name>.azurewebsites.net/api/...` and return status `200 OK` without CORS errors.

3. **Production Domain Cutover (Optional)**:
   - When ready to switch live traffic from Vercel to Azure:
     1. Go to Azure Portal > Frontend App Service > **Custom domains**.
     2. Add your custom domain (`globalcxocircle.com`).
     3. Update your DNS CNAME / A records at your domain provider to point to your Azure App Service.
