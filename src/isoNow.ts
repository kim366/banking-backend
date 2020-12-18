export default function isoNow(offsetSeconds = 0) {
  return new Date(new Date().getTime() + offsetSeconds * 1000).toISOString();
}
