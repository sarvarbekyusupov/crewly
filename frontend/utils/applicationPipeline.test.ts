import { describe, expect, it } from 'vitest'
import { groupApplicationsByStage, hiringStepIndex } from './applicationPipeline'

describe('applicationPipeline', () => {
  it('groups applications by kanban stage', () => {
    const groups = groupApplicationsByStage([
      { id: '1', status: 'matched' } as any,
      { id: '2', status: 'hired' } as any,
    ])
    expect(groups.find((g) => g.key === 'matched')?.cards).toHaveLength(1)
    expect(groups.find((g) => g.key === 'hired')?.cards).toHaveLength(1)
  })

  it('maps status to hiring step index', () => {
    expect(hiringStepIndex('interviewed')).toBe(4)
    expect(hiringStepIndex('hired')).toBe(6)
    expect(hiringStepIndex('rejected_by_client')).toBe(-1)
  })
})
