export function toLatLng(lat: number, lng: number) {
  return [lat, lng] as const;
}
