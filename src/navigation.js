import { BarChart3, CalendarDays, ClipboardCheck, Cloud, FileText, FolderOpen, Gavel, HelpCircle, Layers, LayoutDashboard, Mic, MonitorUp, Settings, Timer, Users, Vote } from "lucide-react";

export const WORKSPACE_PAGES = [
  { to: "/", label: "Overview", Icon: LayoutDashboard },
  { to: "/rollcall", label: "Attendance", Icon: ClipboardCheck },
  { to: "/session", label: "The floor", Icon: Mic },
  { to: "/motion", label: "Motions", Icon: Gavel },
  { to: "/vote", label: "Voting", Icon: Vote },
  { to: "/ballot", label: "Recorded votes", Icon: ClipboardCheck },
  { to: "/resolutions", label: "Resolutions", Icon: FileText },
  { to: "/stats", label: "Reports", Icon: BarChart3 },
];

export const WORKSPACE_TOOLS = [
  { to: "/organizer", label: "Organizer", Icon: Users },
  { to: "/presets", label: "Committee presets", Icon: Layers },
  { to: "/agenda", label: "Agenda & bulletin", Icon: CalendarDays },
  { to: "/library", label: "Workspaces", Icon: FolderOpen },
  { to: "/present", label: "Presenter", Icon: MonitorUp },
  { to: "/timer", label: "Timer", Icon: Timer },
  { to: "/cloud", label: "Cloud sessions", Icon: Cloud },
  { to: "/settings", label: "Settings", Icon: Settings },
  { to: "/help", label: "Help & tools", Icon: HelpCircle },
];
