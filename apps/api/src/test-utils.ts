export function currentStatusForTest(startsAt: Date, endsAt: Date, now = new Date()) {
  if (now < startsAt) return 'upcoming';
  if (now >= endsAt) return 'closed';
  return 'open';
}
