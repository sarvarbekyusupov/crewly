import { defineStore } from 'pinia'

export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    currentStep: 1,
    completed: [] as number[],
    isUploadingCv: false,
    resumeParsed: false,

    contact: {
      fullName: '',
      phone: '',
      linkedin: '',
      telegram: '',
    },

    location: {
      city: '',
      district: '',
      region: '',
      country: "O'zbekiston",
    },

    skills: {
      tags: [] as string[],
      experienceLevel: '',
      industry: '',
      educationLevel: '',
      graduationYear: null as number | null,
    },

    jobPreferences: {
      desiredRole: '',
      salaryMin: 0,
      salaryMax: 0,
      currency: 'USD' as 'UZS' | 'USD',
      formats: {
        remote: false,
        hybrid: false,
        onsite: false,
        abroad: false,
      },
      types: {
        fullTime: true,
        partTime: false,
        freelance: false,
        internship: false,
      },
    },

    checklist: {
      canStartImmediately: false,
      willingToRelocate: false,
      hasTransport: false,
      foreignGovTies: false,
      needsAccommodations: 'prefer_not' as 'yes' | 'no' | 'prefer_not',
      gender: '',
      noticePeriodDays: null as number | null,
      additionalNotes: '',
    },

    appSettings: {
      resumeOptimization: 'honest' as 'off' | 'honest' | 'aggressive',
      coverLetterOptimization: 'honest' as 'off' | 'honest' | 'aggressive',
      autoApproveResume: false,
      autoApproveCoverLetter: false,
    },
  }),

  actions: {
    setStep(step: number) {
      this.currentStep = step
    },
    markCompleted(step: number) {
      if (!this.completed.includes(step)) this.completed.push(step)
    },
    nextStep() {
      this.markCompleted(this.currentStep)
      if (this.currentStep < 7) this.currentStep++
    },
    prevStep() {
      if (this.currentStep > 1) this.currentStep--
    },
    prefillFromParsed(data: {
      fullName?: string
      phone?: string
      city?: string
      skills?: string[]
      preferredWorkMode?: string
    }) {
      if (data.fullName && !this.contact.fullName) this.contact.fullName = data.fullName
      if (data.phone && !this.contact.phone) this.contact.phone = data.phone
      if (data.city && !this.location.city) this.location.city = data.city
      if (data.skills?.length) {
        this.skills.tags = [...new Set([...this.skills.tags, ...data.skills])]
      }
      if (data.preferredWorkMode) {
        const m = data.preferredWorkMode.toLowerCase()
        if (m.includes('remote')) this.jobPreferences.formats.remote = true
        if (m.includes('hybrid')) this.jobPreferences.formats.hybrid = true
        if (m.includes('office') || m.includes('onsite')) this.jobPreferences.formats.onsite = true
      }
      this.resumeParsed = true
    },
  },
})
