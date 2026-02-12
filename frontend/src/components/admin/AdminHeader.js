import React from "react";
import { Bell, Search } from "lucide-react";

export default function AdminHeader() {
  return (
    <header className="bg-card border-b border-gold/20 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-4 py-2 pl-10 border border-gold/30 bg-transparent focus:border-gold focus:ring-0 text-sm"
            />
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-graphite"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            className="relative p-2 hover:bg-secondary transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-charcoal" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-gold rounded-full"></span>
          </button>

          <div className="flex items-center space-x-3 pl-4 border-l border-gold/20">
            <div className="w-10 h-10 bg-gold flex items-center justify-center">
              <span className="font-serif text-white font-bold">A</span>
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">Admin</p>
              <p className="text-xs text-graphite">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
