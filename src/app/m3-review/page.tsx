import type { Metadata } from "next";

import M3QuestionnaireReview from "./questionnaire-review";

export const metadata: Metadata = {
  title: "M3 Questionnaire Review · MeasureOnce",
  description: "Interactive design review for the MeasureOnce Fit Passport questionnaire.",
};

export default function M3ReviewPage() {
  return <M3QuestionnaireReview />;
}
