/**
 * 金币技能：电磁感应
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteDianCiGanYing(gameStore) {
  return function executeDianCiGanYing(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '电磁感应')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '电磁感应',
        `${caster.name}使用电磁感应，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了电磁感应`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 先检查对手存活城市数量是否>=3
    const aliveCityCount = Object.values(target.cities).filter(
      city => city && city.isAlive !== false && (city.currentHp || city.hp) > 0
    ).length
    if (aliveCityCount < TUNE.dianCiGanYing.minCities) {
      return { success: false, message: '对手城市数量不足3座，无法使用电磁感应' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('电磁感应', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 获取对手可连接的城市（排除被保护城市，优先选择钢铁城市）
    const ironEligible = []
    const normalEligible = []
    Object.entries(target.cities).forEach(([cityName, city]) => {
      if (!city || (city.currentHp || city.hp) <= 0 || city.isAlive === false) return

      // 检查是否被保护
      if (gameStore.protections && gameStore.protections[target.name] &&
          gameStore.protections[target.name][cityName] > 0) {
        return
      }

      // 分离钢铁城市和普通城市
      if (gameStore.ironCities && gameStore.ironCities[target.name] &&
          gameStore.ironCities[target.name][cityName]) {
        ironEligible.push(cityName)
      } else {
        normalEligible.push(cityName)
      }
    })

    const totalEligible = ironEligible.length + normalEligible.length
    if (totalEligible < TUNE.dianCiGanYing.minCities) {
      return { success: false, message: `对手可连接的城市不足3个（当前${totalEligible}个）` }
    }

    // 优先从钢铁城市中选择，不足则用普通城市补充
    let selectedCities = []
    if (ironEligible.length > 0) {
      const shuffledIron = ironEligible.sort(() => Math.random() - 0.5)
      selectedCities.push(...shuffledIron.slice(0, Math.min(TUNE.dianCiGanYing.cityCount, shuffledIron.length)))
    }
    if (selectedCities.length < TUNE.dianCiGanYing.cityCount && normalEligible.length > 0) {
      const shuffledNormal = normalEligible.sort(() => Math.random() - 0.5)
      selectedCities.push(...shuffledNormal.slice(0, TUNE.dianCiGanYing.cityCount - selectedCities.length))
    }

    // 设置电磁感应状态
    gameStore.electromagnetic[target.name] = {
      cities: selectedCities,
      roundsLeft: TUNE.dianCiGanYing.roundsLeft,
      source: caster.name
    }

    const cityNamesList = selectedCities.map(cn => target.cities[cn]?.name || cn).join('、')
    const now = Date.now()
    // 施法者私密日志：仅显示"A对B使用了电磁感应"
    gameStore.logs.push({
      message: `${caster.name}对${target.name}使用了电磁感应`,
      timestamp: now,
      round: gameStore.currentRound,
      isPrivate: true,
      visibleTo: [caster.name]
    })
    // 目标玩家私密日志：显示被连接的城市名（这些是目标自己的城市）
    // 必须通过logs数组（而非addPrivateLog）才能通过Firebase同步到目标客户端
    gameStore.logs.push({
      message: `${caster.name}对${target.name}使用了电磁感应，连接了${cityNamesList}，3回合内连锁受伤50%`,
      timestamp: now + 1,
      round: gameStore.currentRound,
      isPrivate: true,
      visibleTo: [target.name]
    })

    return {
      success: true,
      message: `对${target.name}使用了电磁感应`,
      hidePublicLog: true,
      data: {
        connectedCities: selectedCities
      }
    }
  }
}
