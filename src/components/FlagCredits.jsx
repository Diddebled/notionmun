import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Flag from "./Flag";
import sources from "../data/flagSources.json";
import { publicAsset } from "../utils/siteUrl";

export default function FlagCredits() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#flag-credits") document.getElementById("flag-credits")?.scrollIntoView({ block: "start" });
  }, [hash]);
  return <section id="flag-credits" className="image-credits-section" aria-labelledby="flag-credits-heading">
    <h2 id="flag-credits-heading">Flag artwork credits</h2>
    <p>Country and territory flag artwork: <a href={sources.repositoryUrl} target="_blank" rel="noopener noreferrer">Flagpack</a> by {sources.creator}. {sources.copyright}. Licensed under the <a href={sources.licenseUrl} target="_blank" rel="noopener noreferrer">MIT license</a>.</p>
    <div className="flag-credit-examples" aria-label="Examples of licensed flag artwork">
      {[["USA", "United States"], ["GBR", "United Kingdom"], ["FRA", "France"], ["JPN", "Japan"], ["BRA", "Brazil"], ["GHA", "Ghana"]].map(([code, name]) => <figure key={code}><Flag countryCode={code} /><figcaption>{name}</figcaption></figure>)}
    </div>
    <p>The 249 standard flag files are copied from a pinned Flagpack revision. Their artwork is unchanged; filenames are mapped to committee country codes and displayed at interface sizes. Monaco uses the upstream MC.svg file.</p>
    <p><a href={sources.sourceUrl} target="_blank" rel="noopener noreferrer">Pinned upstream artwork</a><span aria-hidden="true"> / </span><a href={publicAsset(sources.localLicenseUrl)} download>Download full MIT copyright and permission notice</a></p>
    <h3 className="flag-historical-heading">Historical illustrations</h3>
    <p>The five inherited illustrations for Austria-Hungary, the Byzantine Empire, the Ottoman Empire, Prussia and the Roman Empire come from Motion under CPAL-1.0. They are not Flagpack assets and are not presented as verified official historical flags.</p>
    <p>Flag artwork licensing is separate from photograph licensing and the app's software license. The source download includes the full MIT notice and a per-file provenance and checksum manifest. No flag or symbol implies official endorsement.</p>
  </section>;
}
