export const districtRows = [
  { district: "Yavatmal", depth: -72.1, trend: "down", status: "danger" },
  { district: "Amravati", depth: -63.4, trend: "down", status: "danger" },
  { district: "Akola", depth: -58.7, trend: "flat", status: "warning" },
  { district: "Buldhana", depth: -55.8, trend: "down", status: "warning" },
  { district: "Washim", depth: -52.3, trend: "down", status: "warning" },
  { district: "Wardha", depth: -41.2, trend: "stable", status: "ok" },
  { district: "Nagpur", depth: -36.5, trend: "up", status: "safe" },
  { district: "Chandrapur", depth: -44.3, trend: "flat", status: "ok" }
];

export const wells = [
  { n: "Yavatmal Central", lt: 20.39, ln: 78.13, d: 72.1, p: "Apr: -76m\nMay: -78m", fam: 4200, t: "Emergency tanker daily" },
  { n: "Amravati - Warud", lt: 20.93, ln: 77.78, d: 63.4, p: "Apr: -66m\nMay: -71m", fam: 3800, t: "Tanker Mon/Thu" },
  { n: "Yavatmal - Morshi", lt: 20.25, ln: 78.5, d: 68.4, p: "Apr: -72m\nMay: -75m", fam: 2900, t: "Daily tanker" },
  { n: "Amravati HQ", lt: 21.05, ln: 77.6, d: 61.2, p: "Apr: -64m\nMay: -68m", fam: 5200, t: "Tanker Tue/Fri" },
  { n: "Amravati - Daryapur", lt: 20.8, ln: 77.95, d: 66.8, p: "Apr: -70m\nMay: -73m", fam: 1800, t: "Emergency tanker" },
  { n: "Yavatmal South", lt: 20.5, ln: 78.3, d: 70.5, p: "Apr: -74m\nMay: -77m", fam: 2100, t: "Daily tanker" },
  { n: "Akola City", lt: 20.72, ln: 77.07, d: 58.7, p: "Apr: -61m\nMay: -64m", fam: 4100, t: "Tanker weekly" },
  { n: "Buldhana City", lt: 20.53, ln: 76.18, d: 55.8, p: "Apr: -58m\nMay: -62m", fam: 3500, t: "Tanker Wed/Sat" },
  { n: "Washim", lt: 20.11, ln: 77.15, d: 52.1, p: "Apr: -55m\nMay: -58m", fam: 2800, t: "Tanker weekly" },
  { n: "Nagpur City", lt: 21.15, ln: 79.09, d: 36.5, p: "Apr: -38m\nMay: -40m", fam: 12000, t: "Piped supply" },
  { n: "Wardha City", lt: 20.73, ln: 78.6, d: 41.2, p: "Apr: -43m\nMay: -45m", fam: 3200, t: "Tanker Mon" },
  { n: "Chandrapur City", lt: 19.97, ln: 79.3, d: 44.3, p: "Apr: -46m\nMay: -48m", fam: 4800, t: "Tanker Wed" },
  { n: "Gondia", lt: 21.46, ln: 80.2, d: 28.1, p: "Apr: -29m\nMay: -30m", fam: 3200, t: "Piped supply" },
  { n: "Bhandara", lt: 21.17, ln: 79.65, d: 25.4, p: "Apr: -26m\nMay: -27m", fam: 2400, t: "Piped supply" },
  { n: "Gadchiroli", lt: 20.18, ln: 80, d: 22.8, p: "Apr: -23m\nMay: -24m", fam: 1800, t: "Piped supply" }
];

export const latestAlerts = [
  {
    tone: "critical",
    title: "Yavatmal - Water Very Low!",
    text: "Water level is -72m. This is dangerous level. Emergency tankers are coming.",
    time: "Today, 9:00 AM"
  },
  {
    tone: "warn",
    title: "Amravati - Water Going Down",
    text: "Prediction says water will reach -71m by May. Start saving water now.",
    time: "Mar 9, 2026"
  },
  {
    tone: "info",
    title: "Tanker Schedule Updated",
    text: "Next tanker to Warud: Thursday, March 13.",
    time: "Mar 7, 2026"
  }
];

export const complaintRows = [
  { id: "R-1042", problem: "Well dried up", location: "Warud, Amravati", date: "Mar 8", status: "IN REVIEW", note: "Officer Kulkarni is checking", cls: "progress" },
  { id: "R-1038", problem: "No tanker 5 days", location: "Daryapur, Amravati", date: "Mar 2", status: "FIXED", note: "Tanker sent on Mar 5", cls: "resolved" },
  { id: "R-1031", problem: "Hand pump broken", location: "Anjangaon", date: "Feb 28", status: "WAITING", note: "Repair team will come", cls: "info" },
  { id: "R-1020", problem: "Water quality bad", location: "Warud", date: "Feb 20", status: "FIXED", note: "Lab tested - water is safe now", cls: "resolved" },
  { id: "R-1011", problem: "Pipe broken", location: "Morshi", date: "Feb 10", status: "URGENT", note: "Sent to District Collector", cls: "danger" }
];
