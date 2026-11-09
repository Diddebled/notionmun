import photographs from "../data/photographs.json";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { publicAsset } from "../utils/siteUrl";

export default function PhotoCredits() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#image-credits") document.getElementById("image-credits")?.scrollIntoView({ block: "start" });
  }, [hash]);
  return <section id="image-credits" className="image-credits-section" aria-labelledby="image-credits-heading">
    <h2 id="image-credits-heading">Photography credits</h2>
    <p>Reference photographs show real UN venues, not the current committee or conference. NotionMUN is independent and is not affiliated with or endorsed by the United Nations or the photographers.</p>
    <div className="photo-credits-list">
      {photographs.map((photo) => <article key={photo.id} className="photo-credit-record">
        <img src={publicAsset(photo.src)} alt={photo.alt} width={photo.width} height={photo.height} decoding="async" />
        <div><h3>{photo.venue}</h3><p>&copy; {photo.author}, via Wikimedia Commons.</p>
          <p><a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">Original photo and attribution</a><span aria-hidden="true"> / </span><a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a></p>
          <p className="photo-modification-note">{photo.changes}</p>
        </div>
      </article>)}
    </div>
    <p>The photographs retain their own CC BY 4.0 licenses, separate from the software's CPAL-1.0 license. Source and modification records are also included in the source download.</p>
  </section>;
}
