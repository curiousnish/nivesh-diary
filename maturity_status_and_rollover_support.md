# Portfolio Value Calculations and Rollover Support

We have implemented a clean, privacy-focused solution to handle matured investments, prevent double-counting of rolled-over funds, and differentiate between your **Invested Portfolio** and your **Total Portfolio** values.

---

## 💡 How It Works

Instead of deleting old investments (which erases historical data) or keeping them active (which double-counts money once you roll them over), we introduced an explicit **Status** system.

### 1. Investment Statuses
Each investment now has a `status` field:
*   **Active (default)**: The investment is currently running or recently matured and awaiting action.
*   **Closed / Settled**: The investment has matured and the funds have been settled or reinvested. 
    *   *Closed/Settled investments are excluded from the Dashboard summaries, upcoming alerts, and push notifications.*
    *   *They are preserved in the Complete Portfolio list, visually styled as settled, and can be filtered or reopened at any time.*

### 2. Portfolio Calculations on the Dashboard
The dashboard metrics have been updated to support two distinct values:
1.  **Invested Portfolio Value**: Sum of principal (or paid-so-far for RDs) of all currently running investments (status is `active` and maturity date is today or in the future).
2.  **Total Portfolio Value**: Sum of **Invested Portfolio** + matured but unclosed investments (at their matured value).
    > [!NOTE]
    > A matured investment's value is calculated using its expected maturity amount (`matamt`) rather than just its principal, as the interest has already accrued.
3.  **Expected Maturity Value**: Sum of expected returns across all active/unclosed current investments.

---

## 🛠️ Detailed Walkthrough & UI Changes

### A. Dashboard Statistics Grid
The stats cards at the top of the Home Dashboard have been updated:
*   **Invested Portfolio**: Shows the value of actively working investments.
*   **Total Portfolio**: Shows the value of all active plus matured-but-unclosed investments.
*   **Maturing in 90 Days**: Counts upcoming maturities of active investments.

```
┌───────────────────────────┬───────────────────────────┐
│    Invested Portfolio     │      Total Portfolio      │
│         ₹10,50,000        │        ₹11,62,000         │
│          5 active         │  6 current (1 matured)    │
└───────────────────────────┴───────────────────────────┘
```

---

### B. Investment Detail Sheet Actions
When you tap on an investment in the list or from alerts, the Detail Sheet now displays contextual buttons based on the status:

*   **For Active Investments**:
    *   **Mark as Settled / Closed**: Sets the status to `closed`, removing it from the dashboard while retaining it in the portfolio history.
    *   **Reinvest / Roll Over** *(visible only if matured)*: Initiates the reinvestment/rollover flow.
*   **For Closed Investments**:
    *   **Reopen Investment**: Toggles the status back to `active`.

---

### C. Rollover Workflow (Seamless Reinvestment)
Tapping the **Reinvest / Roll Over** button on a matured investment:
1.  Temporarily flags the old investment to close *only when the new one is saved* (ensuring no lost progress if you cancel the form).
2.  Opens the **Add New** form pre-filled with:
    *   **Investment Type**, **Institution**, and **Investor Name** copied from the old investment.
    *   **Start Date** pre-filled with the maturity date of the old investment.
    *   **Principal** pre-filled with the matured amount of the old investment.
    *   **Notes** auto-filled with lineage tracking (`Rolled over from: FD — SBI...`).
3.  **Automatically scrolls to and focuses the Principal input field** so you can easily type in your increment amount (e.g. changing ₹11,000 to ₹12,000).
4.  Once saved, the new investment is created as `active` and the old investment is automatically updated to `closed` in a single action.

---

### D. Complete Portfolio Filters
In the **My Investments** page:
*   By default, closed/settled investments are filtered out to keep the list clean and focused.
*   Closed investments in lists are rendered with a dashed border, muted colors, and a **Settled** status badge.
*   A new **Closed / Settled** checkbox is available in the **Maturity Status** filter section so you can search, view, and analyze your full history.

---

## 📂 Summary of Code Changes

1.  **[app.js](file:///Users/nish/Code/nivesh-diary/js/app.js)**:
    *   Added `rolloverFromId` global variable state tracking.
    *   Updated `renderHome()` to calculate `investedVal` vs `totalVal` and filter recent/urgent alerts to ignore closed items.
    *   Updated `renderList()` and `renderFilterSheet()` to handle `closed` status filtering.
    *   Updated `invCard()` and `openDetail()` to support the settled card style, badges, and contextual action buttons.
    *   Added `settleInvestment()`, `reopenInvestment()`, and `rolloverInvestment()` actions.
    *   Updated `scheduleNotifications()` and sharing functions to exclude closed items.
2.  **[styles.css](file:///Users/nish/Code/nivesh-diary/css/styles.css)**:
    *   Added `.inv-card.is-closed` styling (65% opacity, dashed border, and muted text).
    *   Added `.mat-chip.closed` styling (subtle grey badge).
