import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, token } = useSelector((state) => state.auth);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Support both 'player' and 'user' strings for flexibility during transition
  const normalizedUserRole = user.role === 'user' ? 'player' : user.role;

  if (allowedRoles && !allowedRoles.includes(normalizedUserRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
