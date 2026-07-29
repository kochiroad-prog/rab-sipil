'use client'

import { useState } from 'react'
import VisionEstimator from '@/components/VisionEstimator'
import DxfImporter from '@/components/DxfImporter'
import type { AhspOption } from '@/components/AhspCombobox'

type ProjectOpt = { id: string; name: string }
type Mode = 'foto' | 'dxf'

export default function EstimatorTabs({
  projectId,
  projects,
  ahspItems,
}: {
  projectId?: string
  projects?: ProjectOpt[]
  ahspItems: AhspOption[]
}) {
  const [mode, setMode] = useState<Mode>('foto')

  return (
    <div>
      <div className="mb-3 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setMode('foto')}
          className={`px-3 py-2 text-sm font-medium ${
            mode === 'foto' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Foto / PDF (AI)
        </button>
        <button
          onClick={() => setMode('dxf')}
          className={`px-3 py-2 text-sm font-medium ${
            mode === 'dxf' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          File CAD - DXF (Presisi)
        </button>
      </div>

      {mode === 'foto' ? (
        <VisionEstimator projectId={projectId} projects={projects} ahspItems={ahspItems} />
      ) : (
        <DxfImporter projectId={projectId} projects={projects} ahspItems={ahspItems} />
      )}
    </div>
  )
}
