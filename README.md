# Fare Watch by MoneyMuni

A free public website that shows how the fare for a fixed future trip (Dubai → Hyderabad)
changes **week by week**, starting about a year before travel.

- Checks fares **every Monday** automatically (SerpApi → Google Flights, prices in AED, searched as a UAE user).
- Saves every price in **Supabase**. Visitors only read saved data, so your SerpApi cost does **not** grow with visitors.
- A **daily** job keeps the free Supabase project awake and retries any failed searches.
- Private **/admin** page: logs, searches used this month, "Run now", "Export CSV".

Tracked trips are in `src/config/trips.ts` (2 seasons × 7 departure dates × one-way/return = **28 searches per week**, about 120 a month, within SerpApi's free 250).

---

## Setup (step by step, no coding needed)

### 1. Database (Supabase), 2 minutes
1. Open your Supabase project → left menu **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` in this repository, copy **everything**, paste it into the editor.
3. Click **Run**. You should see "Success. No rows returned".

### 2. Collect your keys (keep them private)
| Setting name | Where to find it |
|---|---|
| `SERPAPI_KEY` | serpapi.com → Dashboard → API Key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API / Data API → Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → **Publishable** key (or legacy "anon" key) |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → **Secret** key (or legacy "service_role" key) |
| `CRON_SECRET` | Make up a long random text (e.g. 30+ letters and numbers) |
| `ADMIN_PASSWORD` | Make up your own password for the /admin page |
| `MONTHLY_SEARCH_CAP` | Optional. Default 200 |

Never paste these into GitHub, chats or screenshots.

### 3. Put it online (Vercel), 10 minutes
1. Go to vercel.com → **Add New… → Project** → import the **fare-watch** GitHub repository.
2. Before clicking Deploy, open **Environment Variables** and add every setting from the table above (name + value).
3. Click **Deploy**. You'll get an address like `fare-watch-xxxx.vercel.app`.

### 4. First data
1. Open `https://YOUR-ADDRESS.vercel.app/admin`, type your admin password, click **Open**.
2. Click **Run now**. Wait up to a minute.
3. Open the home page. Your first prices appear (September dates may show later, since airlines open bookings about 11 months ahead).

### 5. Automatic schedules
`vercel.json` already sets two schedules (times in UTC):
- `/api/collect`: every **Monday 04:00 UTC** (08:00 UAE): weekly fare check
- `/api/daily`: every day **04:30 UTC**: keep-alive + retry failed searches

Vercel runs these automatically after deploy and sends your `CRON_SECRET` with each call.
Check them in Vercel → Project → **Settings → Cron Jobs**.

---

## Changing things later
- **Add a route or change dates:** edit `src/config/trips.ts`. More trips = more searches, so keep the monthly total under your SerpApi plan.
- **Social links:** edit `src/config/site.ts`.
- **Child fare estimate / return stay length:** `CHILD_FARE_RATIO` and `RETURN_STAY_DAYS` in `src/config/trips.ts`.

## Notes
- Prices are the lowest found on Google Flights at the time of checking and may differ when booking.
- Budget fares may not include checked baggage; the site says so and lets users add a baggage cost.
- Vercel's free Hobby plan is for non-commercial use. If you later add affiliate links, review Vercel's terms.
Live on Vercel.
