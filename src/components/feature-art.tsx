export function FeatureArt() {
  return (
    <div className="feature-art" aria-hidden="true">
      <span className="art-label">MODEL COMPLEXITY</span>
      <svg viewBox="0 0 420 250" fill="none">
        <defs>
          <pattern
            id="grid"
            width="35"
            height="35"
            patternUnits="userSpaceOnUse"
          >
            <path d="M35 0H0V35" stroke="currentColor" strokeOpacity=".10" />
          </pattern>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#6689b5" stopOpacity=".18" />
            <stop offset="1" stopColor="#6689b5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="420" height="250" fill="url(#grid)" />
        <path
          d="M40 50C100 180 170 205 375 210"
          stroke="#7c96b5"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d="M40 208C240 208 310 170 375 45"
          stroke="#7c96b5"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path d="M40 63C125 230 238 231 375 60V230H40Z" fill="url(#fade)" />
        <path
          d="M40 63C125 230 238 231 375 60"
          stroke="#345d8d"
          strokeWidth="3"
        />
        <path
          d="M203 180V239"
          stroke="#345d8d"
          strokeOpacity=".35"
          strokeDasharray="3 4"
        />
        <circle
          cx="203"
          cy="188"
          r="6"
          fill="#345d8d"
          stroke="var(--surface)"
          strokeWidth="3"
        />
      </svg>
      <div className="art-legend">
        <span>
          <i />
          Bias²
        </span>
        <span>
          <i />
          Variance
        </span>
        <span>
          <i />
          Total error
        </span>
      </div>
    </div>
  );
}
