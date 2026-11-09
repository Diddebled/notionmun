import photographs from "../data/photographs.json";

export function getVenuePhoto(committeeLabel = "") {
  const id = /security council|\bunsc\b/i.test(committeeLabel) ? "security-council" : "general-assembly";
  return photographs.find((photo) => photo.id === id);
}
