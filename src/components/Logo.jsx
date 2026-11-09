import { BRAND } from "../brand";

export default function Logo({ compact = false, size = "", color }) {
  return <span className="notion-brand" aria-label={BRAND.name} style={color ? { color } : undefined}>
    <span className={`notion-mark ${size}`} aria-hidden="true">n<span /></span>
    {!compact && <span className="notion-wordmark">Notion<strong>MUN.com</strong></span>}
  </span>;
}
