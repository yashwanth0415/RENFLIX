import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { createPortal } from "react-dom";
import { LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const navigate = useNavigate();
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<{ message: string; resolve: (value: boolean) => void } | null>(null);

  useEffect(() => {
    const requestSignout = () => setShowSignoutConfirm(true);
    const requestConfirm = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; resolve: (value: boolean) => void }>).detail;
      if (!detail?.message || typeof detail.resolve !== "function") return;
      setConfirmRequest(detail);
    };
    window.addEventListener("renflix:request-signout", requestSignout);
    window.addEventListener("renflix:request-confirm", requestConfirm);
    return () => {
      window.removeEventListener("renflix:request-signout", requestSignout);
      window.removeEventListener("renflix:request-confirm", requestConfirm);
    };
  }, []);

  useEffect(() => {
    if (!showSignoutConfirm && !confirmRequest) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || signingOut) return;
      if (confirmRequest) {
        const request = confirmRequest;
        setConfirmRequest(null);
        request.resolve(false);
      } else {
        setShowSignoutConfirm(false);
      }
    };
    const oldOverflow = document.body.style.overflow;
    const oldOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.body.style.overscrollBehavior = oldOverscroll;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showSignoutConfirm, confirmRequest, signingOut]);

  const confirmSignout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSigningOut(false);
      return;
    }
    setShowSignoutConfirm(false);
    navigate("/login", { replace: true });
  };

  const closeConfirm = (value: boolean) => {
    const request = confirmRequest;
    setConfirmRequest(null);
    request?.resolve(value);
  };

  const confirmOverlay = confirmRequest ? createPortal(
    <div className="renflix-signout-overlay" role="dialog" aria-modal="true" aria-labelledby="renflix-confirm-title"
      onClick={(e) => { if (e.target === e.currentTarget) closeConfirm(false); }}>
      <div className="renflix-signout-dialog">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">✓</div>
          <div className="min-w-0">
            <h3 id="renflix-confirm-title" className="font-display font-bold text-white">Please confirm</h3>
            <p className="text-sm text-navy-400 mt-1 whitespace-pre-line">{confirmRequest.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="px-3 py-2 rounded-lg text-sm text-navy-300 hover:bg-navy-700 transition-colors" onClick={() => closeConfirm(false)}>Cancel</button>
          <button type="button" className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors" onClick={() => closeConfirm(true)}>Confirm</button>
        </div>
      </div>
    </div>, document.body
  ) : null;

  const overlay = showSignoutConfirm ? createPortal(
    <div className="renflix-signout-overlay" role="dialog" aria-modal="true" aria-labelledby="renflix-signout-title"
      onClick={(e) => { if (e.target === e.currentTarget && !signingOut) setShowSignoutConfirm(false); }}>
      <div className="renflix-signout-dialog">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 flex-shrink-0"><LogOut size={18} /></div>
          <div className="min-w-0">
            <h3 id="renflix-signout-title" className="font-display font-bold text-white">Sign out?</h3>
            <p className="text-sm text-navy-400 mt-1">Are you sure you want to sign out of RENFLIX?</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="px-3 py-2 rounded-lg text-sm text-navy-300 hover:bg-navy-700 transition-colors disabled:opacity-50" onClick={() => setShowSignoutConfirm(false)} disabled={signingOut}>Cancel</button>
          <button type="button" className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60" onClick={confirmSignout} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return <>
    <Outlet />
    {overlay}
    {confirmOverlay}
  </>;
}
