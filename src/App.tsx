import { useEffect, useState } from "react";
import Admin from "./pages/Admin";
import Register from "./pages/Register";
import Scan from "./pages/Scan";

type Page = "register" | "admin" | "scan";

function currentPage(): Page {
  const hash = window.location.hash.replace(/^#/, "");
  const source = hash || window.location.pathname;
  if (source.includes("admin")) return "admin";
  if (source.includes("scan")) return "scan";
  return "register";
}

export default function App() {
  const [page, setPage] = useState<Page>(currentPage);

  useEffect(() => {
    const sync = () => setPage(currentPage());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  if (page === "admin") return <Admin />;
  if (page === "scan") return <Scan />;
  return <Register />;
}
