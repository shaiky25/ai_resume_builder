export interface ResumeExperienceEntry {
  company: string;
  role: string;
  description: string;
}

export interface ResumeDraft {
  name: string;
  title: string;
  summary: string;
  experience: ResumeExperienceEntry[];
}

export const emptyResumeDraft: ResumeDraft = {
  name: "",
  title: "",
  summary: "",
  experience: [],
};

export interface TargetJob {
  title: string;
  company: string;
  description: string;
}

export interface BaselineAssessment {
  matchScore: number;
  missingKeywords: string[];
  redFlags: string[];
}

export interface TailoringStrategy {
  matchedKeywords: string[];
  missingKeywords: string[];
  prioritizedGaps: string[];
  rewriteGuidance: string[];
  lowRelevance: boolean;
}
