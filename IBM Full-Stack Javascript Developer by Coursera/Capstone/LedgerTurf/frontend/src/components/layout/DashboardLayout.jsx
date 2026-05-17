import React from 'react';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar role={user?.role} />
      <main className="flex-1 ml-80 p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
