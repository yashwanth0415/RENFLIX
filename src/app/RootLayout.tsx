import { Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";

export default function RootLayout() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}