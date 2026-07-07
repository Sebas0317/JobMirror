# Scoring Engine Details

The scoring engine combines four orthogonal sub‑scores to produce a final 0‑100 ranking for each vacancy.  The implementation lives in `src/core/scoringEngine.ts`.

## Sub‑scores
| Name | Weight | Description |
|------|--------|-------------|
| **Compatibility** | **0.5** | Intersection between the user profile's skills and the extracted vacancy skills.  Calculated as `matched / totalVacancySkills * 100`.
| **Transfer** | **0.3** | Potential learning value: proportion of vacancy skills **not** owned by the profile, scaled to a maximum of 80 points.
| **Growth** | **0.15** | Heuristic based on seniority (`junior` → 90, `mid` → 70, `senior` → 50).
| **Risk Penalty** | **0.05** (subtracted) | Penalties for missing mandatory skills (e.g., *SAP*) and seniority mismatches.  Each missing mandatory skill adds 15 points, each seniority mismatch adds 10 points.

## Calculation Flow
```ts
const compatibility = vacancySkills.length
  ? (matched.length / vacancySkills.length) * 100
  : 0;
const transfer = vacancySkills.length
  ? ((vacancySkills.length - matched.length) / vacancySkills.length) * 80
  : 0;
const growth = /* based on profile.seniority */;
const { missingMandatory, seniorityMismatch } = analyseRisk(vacancy, profile);
const riskPenalty = missingMandatory * 15 + seniorityMismatch * 10;

const rawScore = compatibility * 0.5 + transfer * 0.3 + growth * 0.15;
const finalScore = Math.max(0, rawScore - riskPenalty);
```

The function returns:
```ts
return {
  score: Number(finalScore.toFixed(2)),
  breakdown: {
    compatibility,
    transfer,
    growth,
    riskPenalty,
    matchedSkills,
    missingSkills,
  },
};
```

## Explainability
The `breakdown` object is sent to the frontend so the UI can display a transparent justification for each vacancy's ranking.
