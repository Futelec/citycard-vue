/**
 * 金币技能：时来运转·交换执行
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteFortuneSwap(gameStore) {
  return function executeFortuneSwap(casterName, targetName, casterCities, targetCities) {
    const caster = gameStore.players.find(p => p.name === casterName)
    const target = gameStore.players.find(p => p.name === targetName)

    if (!caster || !target) {
      return { success: false, message: '找不到玩家' }
    }

    // 处理狐假虎威伪装城市（被交换时自毁并识破）
    const exposedCaster = []
    const exposedTarget = []
    const normalCaster = []
    const normalTarget = []

    casterCities.forEach(cityName => {
      const disguise = gameStore.disguisedCities[caster.name]?.[cityName]
      if (disguise && disguise.roundsLeft > 0) {
        const city = caster.cities[cityName]
        if (city) {
          city.isAlive = false
          city.currentHp = 0
          if (!disguise.paid) {
            caster.gold = Math.max(0, caster.gold - TUNE.fortuneSwap.exposeGoldPenalty)
            disguise.paid = true
          }
          disguise.roundsLeft = 0
          exposedCaster.push({ fake: disguise.fakeName, real: city.name })
        }
      } else {
        normalCaster.push({ cityName })
      }
    })

    targetCities.forEach(cityName => {
      const disguise = gameStore.disguisedCities[target.name]?.[cityName]
      if (disguise && disguise.roundsLeft > 0) {
        const city = target.cities[cityName]
        if (city) {
          city.isAlive = false
          city.currentHp = 0
          if (!disguise.paid) {
            target.gold = Math.max(0, target.gold - TUNE.fortuneSwap.exposeGoldPenalty)
            disguise.paid = true
          }
          disguise.roundsLeft = 0
          exposedTarget.push({ fake: disguise.fakeName, real: city.name })
        }
      } else {
        normalTarget.push({ cityName })
      }
    })

    // 实际交换普通城市（伪装城市已自毁，不参与交换）
    const minLen = Math.min(normalCaster.length, normalTarget.length)
    const swappedPairs = []

    for (let k = 0; k < minLen; k++) {
      const casterCityKey = normalCaster[k].cityName
      const targetCityKey = normalTarget[k].cityName

      const casterCityObj = caster.cities[casterCityKey]
      const targetCityObj = target.cities[targetCityKey]

      // 正确交换name-keyed城市
      delete caster.cities[casterCityKey]
      delete target.cities[targetCityKey]

      caster.cities[targetCityKey] = targetCityObj
      target.cities[casterCityKey] = casterCityObj

      // 同步交换initialCities
      if (gameStore.initialCities[caster.name] && gameStore.initialCities[target.name]) {
        const casterInitial = gameStore.initialCities[caster.name][casterCityKey]
        const targetInitial = gameStore.initialCities[target.name][targetCityKey]

        delete gameStore.initialCities[caster.name][casterCityKey]
        delete gameStore.initialCities[target.name][targetCityKey]

        if (targetInitial) gameStore.initialCities[caster.name][targetCityKey] = targetInitial
        if (casterInitial) gameStore.initialCities[target.name][casterCityKey] = casterInitial
      }

      // 标记城市为已知
      gameStore.setCityKnown(caster.name, targetCityKey, target.name)
      gameStore.setCityKnown(target.name, casterCityKey, caster.name)

      swappedPairs.push({
        casterCity: casterCityObj.name,
        targetCity: targetCityObj.name
      })
    }

    // 交换疲劳计数器
    for (let k = 0; k < minLen; k++) {
      const casterCityKey = normalCaster[k].cityName
      const targetCityKey = normalTarget[k].cityName

      if (!caster.streaks) caster.streaks = {}
      if (!target.streaks) target.streaks = {}

      const casterStreak = caster.streaks[casterCityKey] || 0
      const targetStreak = target.streaks[targetCityKey] || 0

      delete caster.streaks[casterCityKey]
      delete target.streaks[targetCityKey]

      caster.streaks[targetCityKey] = targetStreak
      target.streaks[casterCityKey] = casterStreak
    }

    // 交换拔旗易帜标记
    for (let k = 0; k < minLen; k++) {
      const casterCityKey = normalCaster[k].cityName
      const targetCityKey = normalTarget[k].cityName

      if (!gameStore.changeFlagMark[caster.name]) gameStore.changeFlagMark[caster.name] = {}
      if (!gameStore.changeFlagMark[target.name]) gameStore.changeFlagMark[target.name] = {}

      const casterMark = gameStore.changeFlagMark[caster.name][casterCityKey]
      const targetMark = gameStore.changeFlagMark[target.name][targetCityKey]

      delete gameStore.changeFlagMark[caster.name][casterCityKey]
      delete gameStore.changeFlagMark[target.name][targetCityKey]

      if (targetMark) {
        gameStore.changeFlagMark[caster.name][targetCityKey] = { ...targetMark }
      }
      if (casterMark) {
        gameStore.changeFlagMark[target.name][casterCityKey] = { ...casterMark }
      }
    }

    // 日志记录
    addSkillUsageLog(
      gameStore,
      caster.name,
      '时来运转',
      `>>> ${caster.name}对${target.name}使用时来运转`,
      `${caster.name}使用了时来运转`
    )

    if (swappedPairs.length > 0) {
      const swapText = swappedPairs.map((pair, i) =>
        `第${i+1}对：${caster.name}的${pair.casterCity} ⇄ ${target.name}的${pair.targetCity}`
      ).join('，')
      addSkillEffectLog(gameStore, swapText)
    }

    if (exposedCaster.length > 0) {
      const details = exposedCaster.map(x => `${x.fake}（实为${x.real}，狐假虎威被识破并自毁）`).join('、')
      addSkillEffectLog(gameStore, `${caster.name}的${details}`)
    }

    if (exposedTarget.length > 0) {
      const details = exposedTarget.map(x => `${x.fake}（实为${x.real}，狐假虎威被识破并自毁）`).join('、')
      addSkillEffectLog(gameStore, `${target.name}的${details}`)
    }

    return {
      success: true,
      message: `交换了${swappedPairs.length}对城市${exposedCaster.length + exposedTarget.length > 0 ? '，部分伪装城市被识破' : ''}`
    }
  }
}
