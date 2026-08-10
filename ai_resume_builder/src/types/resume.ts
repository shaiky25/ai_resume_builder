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
