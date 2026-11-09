import { BarChart3, ClipboardCheck, Cloud, FileText, Gavel, LayoutDashboard, Mic, Settings, Timer, Vote } from "lucide-react";

export const WORKSPACE_PAGES = [
  { to: "/", label: "Overview", Icon: LayoutDashboard },
  { to: "/rollcall", label: "Attendance", Icon: ClipboardCheck },
  { to: "/session", label: "The floor", Icon: Mic },
  { to: "/motion", label: "Motions", Icon: Gavel },
  { to: "/vote", label: "Voting", Icon: Vote },
  { to: "/resolutions", label: "Resolutions", Icon: FileText },
  { to: "/stats", label: "Reports", Icon: BarChart3 },
];

export const WORKSPACE_TOOLS = [
  { to: "/timer", label: "Timer", Icon: Timer },
  { to: "/cloud", label: "Cloud sessions", Icon: Cloud },
  { to: "/settings", label: "Settings", Icon: Settings },
];
