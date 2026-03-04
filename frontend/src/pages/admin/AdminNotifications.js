import React from "react";

export default function AdminNotifications() {
  return (
    <div className="p-8">
      <h1 className="font-serif text-3xl text-charcoal">Notifications</h1>
      <p className="mt-2 text-graphite">No notifications yet.</p>

      <div className="mt-6 border border-gold/20 bg-card p-6">
        <p className="text-sm text-graphite">
          This is where you’ll show order alerts, low stock alerts, review approvals, etc.
        </p>
      </div>
    </div>
  );
}