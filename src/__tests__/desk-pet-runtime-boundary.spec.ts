import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

function expectNoDeskPetRuntimeImport(source: string) {
  expect(source).not.toMatch(
    /from\s+['"][^'"]*(?:desk-pet\/|petStates|useDeskPetWorkflowReactions)/
  )
  expect(source).not.toMatch(
    /import\s*\(\s*['"][^'"]*(?:desk-pet\/|petStates|useDeskPetWorkflowReactions)/
  )
  expect(source).not.toContain('PET_STATE_IMAGE_MAP')
  expect(source).not.toContain('DESK_PET_AUX_PRELOAD_STATES')
  expect(source).not.toContain('PetState.')
}

describe('desk pet runtime boundary', () => {
  it('keeps DeskPet behind the App async component gate', () => {
    const source = readSource('src/App.vue')

    expect(source).toMatch(
      /const\s+DeskPet\s*=\s*defineAsyncComponent\(\s*\(\)\s*=>\s*import\(['"]@\/components\/ui\/DeskPet\.vue['"]\)\s*\)/
    )
    expect(source).toContain('<DeskPet v-if="showDeskPet"')
    expect(source).toMatch(
      /const\s+showDeskPet\s*=\s*computed\(\s*\(\)\s*=>\s*decorationsReady\.value\s*&&\s*\(settings\.value\.deskPet\.enabled\s*\|\|\s*showAutoHomeDeskPet\.value\)\s*\)/
    )
    expect(source).toMatch(
      /const\s+showAutoHomeDeskPet\s*=\s*computed\([\s\S]*settings\.value\.deskPet\.enabled[\s\S]*settings\.value\.deskPet\.autoHomeEnabled[\s\S]*settings\.value\.deskPet\.autoHeroInteraction/
    )

    expect(source).not.toMatch(/import\s+DeskPet\s+from\s+['"][^'"]*DeskPet\.vue['"]/)
    expectNoDeskPetRuntimeImport(source)
  })

  it('keeps settings and state indicator surfaces decoupled from desk pet runtime modules', () => {
    const settingsPanel = readSource('src/components/layout/SettingsPanel.vue')
    const stateIndicator = readSource('src/components/ui/StateIndicator.vue')

    expect(settingsPanel).toContain('setDeskPet')
    expect(settingsPanel).toContain('deskPetConfig')
    expectNoDeskPetRuntimeImport(settingsPanel)

    expect(stateIndicator).toContain(':data-pet-state="petStateHint"')
    expect(stateIndicator).toContain(':data-rag-activity="ragActivityHint"')
    expect(stateIndicator).toContain(':data-model-status="modelStatusHint"')
    expectNoDeskPetRuntimeImport(stateIndicator)
  })

  it('keeps auxiliary expression preloads inside the mounted DeskPet runtime', () => {
    const appShell = readSource('src/App.vue')
    const deskPet = readSource('src/components/ui/DeskPet.vue')

    expect(appShell).not.toContain('DESK_PET_AUX_PRELOAD_STATES')
    expect(appShell).not.toContain('preloadImages')
    expect(deskPet).toContain('const preloadImages = () =>')
    expect(deskPet).toMatch(/onMounted\(\(\)\s*=>\s*{[\s\S]*scheduleAuxImagePreload\(\)/)
  })
})
