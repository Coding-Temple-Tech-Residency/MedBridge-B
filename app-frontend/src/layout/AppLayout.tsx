import { Outlet } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import type { ReactNode } from "react";

export const AppLayout = (): ReactNode => {
  return (
    <div className="layout-container">
      <NavBar />
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
};
