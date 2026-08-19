import {
  RouterProvider,
} from "react-router";
import AppErrorBoundary from "./components/AppErrorBoundary";

import {
  router,
} from "./app/routes";

export default function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}