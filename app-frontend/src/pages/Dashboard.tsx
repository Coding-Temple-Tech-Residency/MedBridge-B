// src/pages/Dashboard.tsx
import type { ReactNode } from "react";
import "../main.css";
import CalendarView from "../components/CalendarView";

export const Dashboard = (): ReactNode => {
  return (
    <div className="page-container"
      style={{ 
        width: '90vw', 
        height: '100vh', 
        margin: 0, 
        padding: '34px', // Gives content breathing room from the screen edge
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflow: 'hidden' // Prevents layout breaks if children misbehave
      }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
          <p className="page-description" style={{ margin: '4px 0 0 0' }}>
            Welcome to your dashboard. This is where high‑level summaries and quick
            actions will eventually live.
          </p>
      </div>

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <CalendarView />
      </div>
      <textarea placeholder="Additional Notes..." 
      style={{ 
        border: '1px solid #ccc', 
        borderRadius: '4px', 
        margin: 0, 
        padding: '24px', // Gives content breathing room from the screen edge
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        resize:'none',
        overflow: 'scroll',
         }} />
    </div>
  );
};
