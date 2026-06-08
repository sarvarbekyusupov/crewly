import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const jobs = await $fetch<any[]>('/api/v1/public/jobs', {
      baseURL: config.public.apiBase,
    })

    return jobs.map((job) => ({
      loc: `/jobs/${job.id}`,
      lastmod: job.updatedAt,
      changefreq: 'daily',
      priority: 0.8,
    }))
  } catch (err) {
    console.error('Failed to fetch jobs for sitemap:', err)
    return []
  }
})
