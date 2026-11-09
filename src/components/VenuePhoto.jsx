import { Link } from "react-router-dom";
import { Copyright } from "lucide-react";
import { getVenuePhoto } from "../utils/venuePhoto";
import { publicAsset } from "../utils/siteUrl";

export default function VenuePhoto({ committeeLabel }) {
  const photo = getVenuePhoto(committeeLabel);
  return <figure className="venue-photo">
    <div className="desk-section-heading"><h2>Reference venue</h2><Link to="/licensing#image-credits" title="Photo credits" aria-label="Photo credits"><Copyright size={15} /></Link></div>
    <img src={publicAsset(photo.src)} alt={photo.alt} width={photo.width} height={photo.height} decoding="async" />
    <figcaption>
      <span className="venue-photo-title">{photo.venue}</span>
      <span className="venue-photo-credit"><a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">&copy; {photo.author}</a><span aria-hidden="true"> / </span><a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a></span>
    </figcaption>
  </figure>;
}
