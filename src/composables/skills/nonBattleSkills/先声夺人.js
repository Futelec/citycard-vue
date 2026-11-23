/**
 * 金币技能：先声夺人
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteXianShengDuoRen(gameStore) {
  return function executeXianShengDuoRen(caster, target, params = {}) {
    const { casterCityName } = params

    // 前置检查1：必须提供casterCityName
    if (!casterCityName) {
      return {
        success: false,
        message: '未选择己方城市'
      }
    }

    // 前置检查2：构建可交换城市池（排除：谨慎交换集合、阵亡、中心城市、定海神针、钢铁城市、保护）
    function getEligibleCities(player) {
      const eligible = []
      // 关键修复：player.cities 是对象，使用 Object.entries 遍历
      Object.entries(player.cities).forEach(([cityName, city]) => {
        // 已阵亡不参与
        if (city.isAlive === false) return

        // 谨慎交换集合不参与（包括cautionSet和cautiousExchange）
        if (gameStore.isInCautiousSet(player.name, cityName)) return

        // 中心城市不参与
        if (city.isCenter) return

        // 定海神针不参与
        if (gameStore.anchored[player.name] && gameStore.anchored[player.name][cityName]) return

        // 钢铁城市不参与
        if (gameStore.hasIronShield(player.name, cityName)) return

        // 被保护不参与
        if (gameStore.hasProtection(player.name, cityName)) return

        eligible.push(cityName)
      })
      return eligible
    }

    const eligibleCaster = getEligibleCities(caster)
    const eligibleTarget = getEligibleCities(target)

    // 前置检查3：可交换城市数量检查
    if (eligibleCaster.length === 0 || eligibleTarget.length === 0) {
      return {
        success: false,
        message: '双方至少有一方没有可交换的城市（排除谨慎交换集合）'
      }
    }

    // 前置检查4：验证casterCityName在可选范围内
    if (!eligibleCaster.includes(casterCityName)) {
      return {
        success: false,
        message: '选择的城市不可交换（可能在谨慎交换集合或其他限制）'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('先声夺人', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 创建待处理交换请求（使用cityName）
    const swap = gameStore.createPendingSwap(caster.name, target.name, casterCityName)

    debugLog('[先声夺人] ===== 创建交换请求 =====')
    debugLog('[先声夺人] 返回的 swap:', swap)
    debugLog('[先声夺人] swap.initiatorCityName:', swap?.initiatorCityName)
    debugLog('[先声夺人] 可交换城市列表:')
    debugLog(`[先声夺人]   ${caster.name}: [${eligibleCaster.join(', ')}]`)
    debugLog(`[先声夺人]   ${target.name}: [${eligibleTarget.join(', ')}]`)
    debugLog('[先声夺人] ===============================')

    // 双日志：记录技能使用和待处理状态
    addSkillUsageLog(
      gameStore,
      caster.name,
      '先声夺人',
      `${caster.name}使用了先声夺人，等待${target.name}选择交换城市`,
      `${caster.name}使用了先声夺人`
    )

    debugLog(`[先声夺人] ${caster.name} 发起请求`)
    debugLog(`[先声夺人] 待处理请求ID: ${swap.id}`)
    debugLog(`[先声夺人] ${caster.name}选择: ${casterCityName}`)
    debugLog(`[先声夺人] 等待${target.name}响应...`)

    return {
      success: true,
      message: `等待${target.name}选择交换城市`,
      pendingSwapId: swap.id,
      isPending: true // 标记为待处理状态
    }
  }
}
