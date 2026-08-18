import {
  contentContextScore,
  contentEligibleForMoment,
  contextMode,
  deriveMoment,
  localDateKey,
  previousDateKey,
  safeTimeZone,
  situationLabelForMoment,
  type ContextMoment,
  type ContextProfile,
} from "./engine.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyProfile: ContextProfile = {
  functionArea: null,
  industry: null,
  primaryGoal: null,
  studyStage: null,
  roleFocus: null,
  responsibilityScope: null,
  organisationScale: null,
};

Deno.test("context mode follows weekday work, mixed and personal boundaries", () => {
  assert(contextMode({ localWeekday: 1, localHour: 8, localMinute: 15 }) === "mixed", "08:15 weekday should be mixed");
  assert(contextMode({ localWeekday: 1, localHour: 9, localMinute: 0 }) === "work", "09:00 weekday should be work");
  assert(contextMode({ localWeekday: 1, localHour: 17, localMinute: 29 }) === "work", "17:29 weekday should be work");
  assert(contextMode({ localWeekday: 1, localHour: 17, localMinute: 30 }) === "personal", "17:30 weekday should be personal");
  assert(contextMode({ localWeekday: 6, localHour: 11, localMinute: 0 }) === "personal", "Saturday should be personal");
});

Deno.test("casual learners never receive professional-only content", () => {
  const evening: ContextMoment = { localWeekday: 2, localHour: 20, localMinute: 0 };
  assert(contentEligibleForMoment({ audience_segments: ["casual"] }, "casual", evening), "casual content should be eligible");
  assert(!contentEligibleForMoment({ audience_segments: ["executive"] }, "casual", evening), "executive-only content must not transfer to casual learners");
  assert(!contentEligibleForMoment({ audience_segments: ["management"] }, "casual", evening), "management-only content must not transfer to casual learners");
});

Deno.test("professional learners can receive life-native content outside work but not during work", () => {
  const evening: ContextMoment = { localWeekday: 2, localHour: 20, localMinute: 0 };
  const work: ContextMoment = { localWeekday: 2, localHour: 11, localMinute: 0 };
  const casualContent = { audience_segments: ["casual"] };
  assert(contentEligibleForMoment(casualContent, "executive", evening), "casual transfer should be eligible in the evening");
  assert(!contentEligibleForMoment(casualContent, "executive", work), "casual transfer should not replace work-native content during work hours");
});

Deno.test("personal-time scoring prefers life-native transfer over exact professional context", () => {
  const evening: ContextMoment = { localWeekday: 2, localHour: 20, localMinute: 0 };
  const casualScore = contentContextScore({ audience_segments: ["casual"] }, "executive", emptyProfile, evening);
  const executiveScore = contentContextScore({ audience_segments: ["executive"] }, "executive", emptyProfile, evening);
  assert(casualScore > executiveScore, `expected life-native score ${casualScore} to beat executive score ${executiveScore} in personal time`);
});

Deno.test("work-time scoring prefers exact professional context", () => {
  const work: ContextMoment = { localWeekday: 2, localHour: 11, localMinute: 0 };
  const exactScore = contentContextScore({ audience_segments: ["executive"] }, "executive", emptyProfile, work);
  const universalScore = contentContextScore({ audience_segments: ["all"] }, "executive", emptyProfile, work);
  assert(exactScore > universalScore, `expected executive score ${exactScore} to beat universal score ${universalScore} in work time`);
});

Deno.test("profile tags materially improve matching without overriding context mode", () => {
  const work: ContextMoment = { localWeekday: 2, localHour: 11, localMinute: 0 };
  const profile: ContextProfile = { ...emptyProfile, functionArea: "technology_engineering", industry: "construction_real_estate", primaryGoal: "ai_and_technology" };
  const matching = contentContextScore({ audience_segments: ["executive"], function_tags: ["technology_engineering"], industry_tags: ["construction_real_estate"], goal_tags: ["ai_and_technology"] }, "executive", profile, work);
  const nonMatching = contentContextScore({ audience_segments: ["executive"], function_tags: ["finance_commercial"], industry_tags: ["healthcare"], goal_tags: ["capital_allocation"] }, "executive", profile, work);
  assert(matching > nonMatching, "canonical profile tags should change ranking");
});

Deno.test("timezone helpers use the user's calendar day", () => {
  const instant = new Date("2026-08-18T23:30:00Z");
  assert(localDateKey(instant, "Europe/London") === "2026-08-19", "London should be on 19 August at 00:30 BST");
  assert(localDateKey(instant, "America/New_York") === "2026-08-18", "New York should still be on 18 August");
  assert(previousDateKey("2026-03-01") === "2026-02-28", "previous date should handle month boundary");
});

Deno.test("derived moment and labels are consistent with timezone", () => {
  const instant = new Date("2026-08-18T18:45:00Z");
  const london = deriveMoment(instant, "Europe/London");
  assert(london.localHour === 19 && london.localMinute === 45, "London moment should resolve to 19:45 BST");
  assert(contextMode(london) === "personal", "19:45 should be personal time");
  assert(situationLabelForMoment(london) === "Tonight’s situation", "19:45 should use tonight label");
});

Deno.test("invalid timezone falls back safely", () => {
  assert(safeTimeZone("Not/AZone") === "Europe/London", "invalid timezone should use safe fallback");
  assert(safeTimeZone("Australia/Sydney") === "Australia/Sydney", "valid timezone should survive validation");
});
