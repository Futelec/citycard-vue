/**
 * 金币技能：时来运转
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteShiLaiYunZhuan(gameStore) {
  return function executeShiLaiYunZhuan(caster, target) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('时来运转', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 前置检查1：检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '时来运转')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '时来运转',
        `${caster.name}使用时来运转，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了时来运转`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 前置检查2：构建可交换城市池（排除：谨慎交换集合、保护、定海神针、阵亡、中心城市、钢铁城市）
    function getEligibleCities(player) {
      const eligible = []
      const cityNames = Object.keys(player.cities)
      cityNames.forEach((cityName) => {
        const city = player.cities[cityName]
        // 已阵亡不参与
        if (city.isAlive === false) return

        // 谨慎交换集合不参与
        if (gameStore.isInCautiousSet(player.name, cityName)) return

        // 被保护不参与
        if (gameStore.hasProtection(player.name, cityName)) return

        // 定海神针不参与
        if (gameStore.anchored[player.name] && gameStore.anchored[player.name][cityName]) return

        // 中心城市不参与
        if (city.isCenter) return

        // 钢铁城市不参与
        if (gameStore.hasIronShield(player.name, cityName)) return

        eligible.push({ cityName })
      })
      return eligible
    }

    const eligibleCaster = getEligibleCities(caster)
    const eligibleTarget = getEligibleCities(target)

    // 前置检查3：可交换城市数量检查
    if (eligibleCaster.length < TUNE.shiLaiYunZhuan.minCities || eligibleTarget.length < TUNE.shiLaiYunZhuan.minCities) {
      return {
        success: false,
        message: `可交换城市不足：${caster.name}可选${eligibleCaster.length}张、${target.name}可选${eligibleTarget.length}张（需各≥3）`
      }
    }

    // 随机选择3个城市
    function pick3Random(arr) {
      const shuffled = [...arr]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled.slice(0, TUNE.shiLaiYunZhuan.pickCount)
    }

    const casterPicks = pick3Random(eligibleCaster)
    const targetPicks = pick3Random(eligibleTarget)

    const casterCities = casterPicks.map(p => p.cityName)
    const targetCities = targetPicks.map(p => p.cityName)

    // 返回准备数据，等待弹窗确认
    return {
      success: true,
      isPending: true,
      casterCities,
      targetCities,
      message: `时来运转准备完成，等待对手响应`
    }
  }
}
