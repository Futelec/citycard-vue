/**
 * 金币技能：人质交换·执行
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteHostageSwap(gameStore) {
  return function executeHostageSwap(casterName, targetName, casterCityKey, targetCityKey) {
    const caster = gameStore.players.find(p => p.name === casterName)
    const target = gameStore.players.find(p => p.name === targetName)

    if (!caster || !target) {
      return { success: false, message: '找不到玩家' }
    }

    const myCityObj = caster.cities[casterCityKey]
    const oppCityObj = target.cities[targetCityKey]

    if (!myCityObj || !oppCityObj) {
      return { success: false, message: '交换城市不存在' }
    }

    // 执行城市交换
    delete caster.cities[casterCityKey]
    delete target.cities[targetCityKey]

    caster.cities[targetCityKey] = oppCityObj
    target.cities[casterCityKey] = myCityObj

    // 同步交换initialCities
    if (gameStore.initialCities[caster.name] && gameStore.initialCities[target.name]) {
      const myInitial = gameStore.initialCities[caster.name][casterCityKey]
      const oppInitial = gameStore.initialCities[target.name][targetCityKey]

      delete gameStore.initialCities[caster.name][casterCityKey]
      delete gameStore.initialCities[target.name][targetCityKey]

      if (oppInitial) gameStore.initialCities[caster.name][targetCityKey] = oppInitial
      if (myInitial) gameStore.initialCities[target.name][casterCityKey] = myInitial
    }

    // 交换疲劳计数器
    if (!caster.streaks) caster.streaks = {}
    if (!target.streaks) target.streaks = {}

    const myStreak = caster.streaks[casterCityKey] || 0
    const oppStreak = target.streaks[targetCityKey] || 0

    delete caster.streaks[casterCityKey]
    delete target.streaks[targetCityKey]

    caster.streaks[targetCityKey] = oppStreak
    target.streaks[casterCityKey] = myStreak

    // 交换拔旗易帜标记
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

    // 标记城市为已知
    gameStore.setCityKnown(caster.name, targetCityKey, target.name)
    gameStore.setCityKnown(target.name, casterCityKey, caster.name)

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '人质交换',
      `${caster.name}对${target.name}使用了人质交换，交换了${myCityObj.name}和${oppCityObj.name}`,
      `${caster.name}使用了人质交换`
    )

    return {
      success: true,
      message: `成功交换了${myCityObj.name}和${oppCityObj.name}`
    }
  }
}
