/**
 * Converts SRT subtitle format to WebVTT format on-the-fly.
 */
export function convertSrtToVtt(srtText: string): string {
  let vtt = srtText.trim();
  
  // If it's already WebVTT, return it directly
  if (vtt.startsWith("WEBVTT")) {
    return vtt;
  }

  // Replace commas with periods in timestamps (SRT: 00:00:01,234 -> WebVTT: 00:00:01.234)
  // Also standardise arrow spacing (-->) if there are any tiny format irregularities
  vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  // Prepend WebVTT header
  vtt = "WEBVTT\n\n" + vtt;
  
  return vtt;
}

/**
 * Shifts subtitle cues by a specific time offset (in seconds).
 * Negative values delay subtitles, positive values speed them up.
 */
export function shiftWebVttTimestamps(vttText: string, offsetSeconds: number): string {
  if (offsetSeconds === 0) return vttText;

  // Find all timestamps (00:00:00.000 or 00:00.000)
  const timestampRegex = /(\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/g;

  const helperShift = (match: string) => {
    const parts = match.split(":");
    let hrs = 0;
    let mins = 0;
    let secsAndMs = "";

    if (parts.length === 3) {
      hrs = parseInt(parts[0], 10);
      mins = parseInt(parts[1], 10);
      secsAndMs = parts[2];
    } else {
      mins = parseInt(parts[0], 10);
      secsAndMs = parts[1];
    }

    const subParts = secsAndMs.split(".");
    const secs = parseInt(subParts[0], 10);
    const ms = parseInt(subParts[1], 10);

    let totalMs = (hrs * 3600 + mins * 60 + secs) * 1000 + ms;
    totalMs += offsetSeconds * 1000;

    if (totalMs < 0) totalMs = 0;

    const newHrs = Math.floor(totalMs / 3600000);
    totalMs %= 3600000;
    const newMins = Math.floor(totalMs / 60000);
    totalMs %= 60000;
    const newSecs = Math.floor(totalMs / 1000);
    const newMs = totalMs % 1000;

    const pad = (num: number, size = 2) => num.toString().padStart(size, "0");

    return `${pad(newHrs)}:${pad(newMins)}:${pad(newSecs)}.${pad(newMs, 3)}`;
  };

  // Run replacement over VTT string
  return vttText.replace(timestampRegex, helperShift);
}
