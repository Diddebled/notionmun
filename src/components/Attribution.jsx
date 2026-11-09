import { Link } from "react-router-dom";
import { publicAsset } from "../utils/siteUrl";

export default function Attribution() {
  return <footer className="motion-attribution">
    <a href="https://motionmun.com/licensing" target="_blank" rel="noopener noreferrer" title="Motion attribution and license"><img src={publicAsset("/favicon.svg")} width="20" height="20" alt="Motion" /></a>
    <a href="https://github.com" target="_blank" rel="noopener noreferrer">Powered by Motion &copy; 2026 Paul Taechaaukarakul</a>
    <span>Copyright (c) 2026 Paul Taechaaukarakul, developer of Motion. All Rights Reserved.</span>
    <Link to="/licensing">CPAL-1.0</Link>
    <Link to="/licensing#image-credits">Photo credits</Link>
    <Link to="/licensing#flag-credits">Flag credits</Link>
  </footer>;
}
