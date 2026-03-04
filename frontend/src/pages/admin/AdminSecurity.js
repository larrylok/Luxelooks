import React, { useState } from "react";
import { toast } from "sonner";
import api from "../../api";

export default function AdminSecurity() {
  const [loading, setLoading] = useState(false);

  // Change password (requires logged-in admin token)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Recovery reset (does NOT require login)
  const [recoveryKey, setRecoveryKey] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  const changePassword = async () => {
    setLoading(true);
    try {
      await api.post("/admin/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success("Password changed. Please login again.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Failed to change password";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const recoveryReset = async () => {
    setLoading(true);
    try {
      await api.post("/admin/recovery-reset-password", {
        recoveryKey,
        newPassword: resetNewPassword,
        confirmPassword: resetConfirmPassword,
      });
      toast.success("Password reset. Now login with the new password.");
      setRecoveryKey("");
      setResetNewPassword("");
      setResetConfirmPassword("");
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Failed to reset password";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-card border border-gold/20 p-6">
        <h1 className="font-serif text-3xl text-charcoal mb-2">Security</h1>
        <p className="text-sm text-graphite mb-6">
          Change the admin password. Minimum 10 characters.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gold/30 bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gold/30 bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gold/30 bg-transparent"
            />
          </div>
        </div>

        <button
          onClick={changePassword}
          disabled={loading}
          className="mt-5 px-6 py-3 bg-gold text-white hover:bg-gold/90 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Password"}
        </button>
      </div>

      <div className="bg-card border border-gold/20 p-6">
        <h2 className="font-serif text-2xl text-charcoal mb-2">Forgot Password (Owner Recovery)</h2>
        <p className="text-sm text-graphite mb-6">
          If the admin forgets the password, use the private recovery key to set a new one.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2">Recovery Key</label>
            <input
              type="password"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              className="w-full px-4 py-2 border border-gold/30 bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">New Password</label>
            <input
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gold/30 bg-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Confirm New Password</label>
            <input
              type="password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gold/30 bg-transparent"
            />
          </div>
        </div>

        <button
          onClick={recoveryReset}
          disabled={loading}
          className="mt-5 px-6 py-3 border border-gold text-charcoal hover:bg-secondary disabled:opacity-50"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </div>
  );
}