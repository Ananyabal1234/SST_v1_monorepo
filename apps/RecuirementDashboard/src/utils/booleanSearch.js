/** Build Boolean strings and public search URLs from a requirement. No scraping. */

const ROLE_SYNONYMS = [
  { keys: ['dot net', 'dotnet', '.net', 'asp.net'], terms: ['.NET', 'Dot Net', 'ASP.NET', 'C#'] },
  { keys: ['javascript', 'java script'], terms: ['JavaScript', 'JS'] },
  { keys: ['react', 'reactjs', 'react.js'], terms: ['React', 'ReactJS', 'React.js'] },
  { keys: ['node', 'nodejs', 'node.js'], terms: ['Node.js', 'NodeJS', 'Node'] },
  { keys: ['angular'], terms: ['Angular', 'AngularJS'] },
  { keys: ['python'], terms: ['Python'] },
  { keys: ['java'], terms: ['Java'] },
  { keys: ['full stack', 'fullstack'], terms: ['Full Stack', 'Fullstack'] },
  { keys: ['qa', 'quality analyst', 'sdet'], terms: ['QA', 'SDET', 'Quality Analyst'] },
  { keys: ['devops'], terms: ['DevOps', 'SRE'] },
];

const LOCATION_SYNONYMS = {
  bangalore: ['Bengaluru', 'Bangalore'],
  bengaluru: ['Bengaluru', 'Bangalore'],
  mumbai: ['Mumbai', 'Bombay'],
  delhi: ['Delhi', 'New Delhi', 'NCR'],
  hyderabad: ['Hyderabad'],
  pune: ['Pune'],
  chennai: ['Chennai', 'Madras'],
  gurgaon: ['Gurugram', 'Gurgaon'],
  gurugram: ['Gurugram', 'Gurgaon'],
  noida: ['Noida'],
};

function quote(term) {
  const s = String(term || '').trim();
  if (!s) return '';
  return /[\s.+#]/.test(s) ? `"${s}"` : s;
}

function orGroup(terms) {
  const uniq = [...new Set(terms.map((t) => String(t || '').trim()).filter(Boolean))];
  if (!uniq.length) return '';
  if (uniq.length === 1) return quote(uniq[0]);
  return `(${uniq.map(quote).join(' OR ')})`;
}

function roleTerms(roleSkill) {
  const raw = String(roleSkill || '').trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const syn = ROLE_SYNONYMS.find((r) => r.keys.some((k) => lower.includes(k)));
  const terms = syn ? [...syn.terms] : [raw];
  if (/develop/i.test(raw)) {
    terms.push('Developer', 'Engineer');
  } else if (/engineer/i.test(raw)) {
    terms.push('Engineer', 'Developer');
  }
  if (!syn) terms.push(raw);
  return terms;
}

function experienceTerms(experience) {
  const raw = String(experience || '').trim();
  if (!raw) return [];
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  if (!m) return [raw];
  const n = m[1];
  return [`${n} years`, `${n}+ years`, `${n} yrs`, `${n} year`];
}

function locationTerms(jobLocation) {
  const raw = String(jobLocation || '').trim();
  if (!raw) return [];
  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  return LOCATION_SYNONYMS[key] || [raw];
}

export function buildBooleanQuery({ roleSkill, experience, jobLocation, remarks } = {}) {
  const parts = [
    orGroup(roleTerms(roleSkill)),
    orGroup(experienceTerms(experience)),
    orGroup(locationTerms(jobLocation)),
  ].filter(Boolean);
  const extra = String(remarks || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  if (extra && extra.split(' ').length <= 8) {
    parts.push(quote(extra));
  }
  return parts.join(' AND ');
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildSearchUrls({ booleanQuery, roleSkill, jobLocation } = {}) {
  const boolean = String(booleanQuery || '').trim();
  const role = String(roleSkill || '').trim();
  const loc = String(jobLocation || '').trim();
  const keywords = boolean || role;
  const roleSlug = slugify(role) || 'jobs';
  const locSlug = slugify(loc);
  const naukri = locSlug
    ? `https://www.naukri.com/${roleSlug}-jobs-in-${locSlug}`
    : `https://www.naukri.com/${roleSlug}-jobs`;
  const indeed = new URL('https://in.indeed.com/jobs');
  if (role) indeed.searchParams.set('q', role);
  if (loc) indeed.searchParams.set('l', loc);
  const googleQ = ['site:linkedin.com/in', keywords].filter(Boolean).join(' ');
  return {
    linkedin: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`,
    naukri,
    indeed: indeed.toString(),
    google: `https://www.google.com/search?q=${encodeURIComponent(googleQ)}`,
  };
}
