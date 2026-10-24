export function FeatureArt({
  kind = "bias-variance",
}: {
  kind?: "agent" | "bias-variance";
}) {
  if (kind === "agent") return <AgentFeatureArt />;
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

function AgentFeatureArt() {
  return (
    <div className="feature-art" aria-hidden="true">
      <span className="art-label">CONTEXT → EVIDENCE → ANSWERS</span>
      <svg viewBox="0 0 420 250" fill="none">
        <g stroke="var(--accent)" strokeOpacity=".4" strokeWidth="1.4">
          <path d="M105 56C150 56 140 120 172 120M105 124H172M105 192C150 192 140 128 172 128M242 124H286M336 144V183H217V148" />
          <path d="m166 116 6 4-6 4m114-4 6 4-6 4m-67 26 4-6 4 6" />
        </g>
        <g fill="var(--bg)" stroke="var(--line)">
          <rect x="16" y="36" width="90" height="40" rx="7" />
          <rect x="16" y="104" width="90" height="40" rx="7" />
          <rect x="16" y="172" width="90" height="40" rx="7" />
          <rect x="172" y="96" width="70" height="56" rx="12" />
          <rect x="286" y="104" width="103" height="40" rx="7" />
        </g>
        <rect
          x="172"
          y="96"
          width="70"
          height="56"
          rx="12"
          fill="var(--soft-accent)"
          stroke="var(--accent)"
          strokeOpacity=".5"
        />
        <g
          fill="var(--muted)"
          fontFamily="Arial, sans-serif"
          fontSize="11"
          textAnchor="middle"
        >
          <text x="61" y="60">
            PROFILE
          </text>
          <text x="61" y="128">
            UI + HISTORY
          </text>
          <text x="61" y="196">
            RAG
          </text>
          <text x="337" y="128">
            GROUNDED ANSWER
          </text>
          <text x="279" y="205" fontSize="9">
            TOOLS + VALIDATION
          </text>
        </g>
        <text
          x="207"
          y="129"
          fill="var(--accent)"
          fontFamily="Arial, sans-serif"
          fontSize="12"
          textAnchor="middle"
        >
          AGENT
        </text>
      </svg>
      <div className="art-legend">
        <span>Memory</span>
        <span>Tools</span>
        <span>Evidence</span>
      </div>
    </div>
  );
}
