import { type ReactNode } from "react";
import "../main.css";
import "./Dashboard.css";
import CalendarView from "../components/CalendarView";

export const Dashboard = (): ReactNode => {
  
  return (
    <div className="dashboard-page-container">
      <div>
        <h1 className="dashboard-header-title">Dashboard</h1>
        <p className="dashboard-header-description">
          Welcome to your dashboard.
        </p>
      </div>

      <div className="dashboard-calendar-wrapper">
        <CalendarView />
      </div>

     
    </div>
  );
};
