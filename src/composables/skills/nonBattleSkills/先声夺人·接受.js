/**
 * 金币技能：先声夺人·接受
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createAcceptPreemptiveStrike(gameStore) {
  return function acceptPreemptiveStrike(swapId, targetCityName) {
    // 关键修复：Pinia会自动解包ref，直接使用gameStore.pendingSwaps（不需要.value）
    const swap = gameStore.pendingSwaps.find(s => s.id === swapId)
    if (!swap || swap.status !== 'pending') {
      return {
        success: false,
        message: '未找到待处理的交换请求或请求已失效'
      }
    }

    const initiator = gameStore.players.find(p => p.name === swap.initiatorName)
    const targetPlayer = gameStore.players.find(p => p.name === swap.targetName)

    if (!initiator || !targetPlayer) {
      return {
        success: false,
        message: '玩家数据异常'
      }
    }

    // 验证targetCityName在可选范围内
    function getEligibleCities(player) {
      const eligible = []
      // 关键修复：player.cities 是对象，使用 Object.entries 遍历
      Object.entries(player.cities).forEach(([cityName, city]) => {
        if (city.isAlive === false) return
        if (gameStore.isInCautiousSet(player.name, cityName)) return
        if (city.isCenter) return
        if (gameStore.anchored[player.name] && gameStore.anchored[player.name][cityName]) return
        if (gameStore.hasIronShield(player.name, cityName)) return
        if (gameStore.hasProtection(player.name, cityName)) return
        eligible.push(cityName)
      })
      return eligible
    }

    const eligibleTarget = getEligibleCities(targetPlayer)
    if (!eligibleTarget.includes(targetCityName)) {
      return {
        success: false,
        message: '选择的城市不可交换'
      }
    }

    // 执行交换
    const initiatorCity = initiator.cities[swap.initiatorCityName]
    const targetCity = targetPlayer.cities[targetCityName]

    if (!initiatorCity || !targetCity) {
      return {
        success: false,
        message: '城市数据异常'
      }
    }

    // 执行交换（深拷贝交换，确保Vue响应式系统能检测到变化）
    // 保存交换前的城市信息（用于日志）
    const initiatorCityBeforeSwap = { ...initiatorCity }
    const targetCityBeforeSwap = { ...targetCity }

    // 关键修复：cities 现在是对象，直接交换两个城市的键值对
    // 先深拷贝两个城市对象
    const tempInitiatorCity = JSON.parse(JSON.stringify(initiatorCity))
    const tempTargetCity = JSON.parse(JSON.stringify(targetCity))

    // 删除原有的城市
    delete initiator.cities[swap.initiatorCityName]
    delete targetPlayer.cities[targetCityName]

    // 添加交换后的城市（城市名称保持不变，但归属玩家改变）
    initiator.cities[targetCityName] = tempTargetCity
    targetPlayer.cities[swap.initiatorCityName] = tempInitiatorCity

    debugLog('[先声夺人] 交换完成（对象方式）')
    debugLog(`[先声夺人] 发起者 ${initiator.name}:`,
      `${swap.initiatorCityName} -> ${targetCityName}`)
    debugLog(`[先声夺人] 目标 ${targetPlayer.name}:`,
      `${targetCityName} -> ${swap.initiatorCityName}`)

    // 注意：initialCities 现在按城市名称追踪（[playerName][cityName]），无需交换
    // 城市交换后，城市的初始HP记录会自动跟随城市名称
    debugLog('[先声夺人] initialCities 按城市名称追踪，无需交换')

    // 交换疲劳streak值（现在存储在player.streaks[cityName]中）
    if (!initiator.streaks) initiator.streaks = {}
    if (!targetPlayer.streaks) targetPlayer.streaks = {}

    const tempInitiatorStreak = initiator.streaks[swap.initiatorCityName] || 0
    const tempTargetStreak = targetPlayer.streaks[targetCityName] || 0

    // 删除原有的streak
    delete initiator.streaks[swap.initiatorCityName]
    delete targetPlayer.streaks[targetCityName]

    // 添加交换后的streak
    initiator.streaks[targetCityName] = tempTargetStreak
    targetPlayer.streaks[swap.initiatorCityName] = tempInitiatorStreak

    debugLog('[先声夺人] 疲劳streak交换:',
      `${initiator.name}[${swap.initiatorCityName}]: ${tempInitiatorStreak} -> ${tempTargetStreak}`,
      `${targetPlayer.name}[${targetCityName}]: ${tempTargetStreak} -> ${tempInitiatorStreak}`)

    // 交换所有基于cityName的状态
    // 这些状态应该跟随城市一起交换，而不是清除
    // TODO: 实现 swapCityNamedStates 函数来交换所有基于城市名称的状态
    // swapCityNamedStates(gameStore, initiator.name, swap.initiatorCityName, targetPlayer.name, targetCityName)

    // 清除特殊状态（这些状态不应该跟随交换）
    // 1. 伪装城市（狐假虎威）- 伪装是基于位置的，交换后应清除
    let disguiseCleared = false
    if (gameStore.disguisedCities[initiator.name] &&
        gameStore.disguisedCities[initiator.name][swap.initiatorCityName]) {
      delete gameStore.disguisedCities[initiator.name][swap.initiatorCityName]
      disguiseCleared = true
      debugLog(`[先声夺人] 清除${initiator.name}的伪装状态`)
    }
    if (gameStore.disguisedCities[targetPlayer.name] &&
        gameStore.disguisedCities[targetPlayer.name][targetCityName]) {
      delete gameStore.disguisedCities[targetPlayer.name][targetCityName]
      disguiseCleared = true
      debugLog(`[先声夺人] 清除${targetPlayer.name}的伪装状态`)
    }

    // 更新请求状态
    gameStore.updatePendingSwapStatus(swapId, 'accepted', targetCityName)

    // 双日志：记录交换完成（使用交换前的城市名称）
    const initiatorCityName = swap.initiatorCityName
    const targetCityNameForLog = targetCityName

    // 构建详细的交换信息
    const swapDetails = []
    swapDetails.push(`城市: ${initiatorCityName}(HP${Math.floor(initiatorCityBeforeSwap.currentHp || initiatorCityBeforeSwap.hp)}) ⇄ ${targetCityNameForLog}(HP${Math.floor(targetCityBeforeSwap.currentHp || targetCityBeforeSwap.hp)})`)
    swapDetails.push(`疲劳: streak ${tempInitiatorStreak} ⇄ ${tempTargetStreak}`)
    if (disguiseCleared) {
      swapDetails.push(`伪装状态已清除`)
    }

    addSkillEffectLog(
      gameStore,
      `(先声夺人) ${initiator.name}的${initiatorCityName} ⇄ ${targetPlayer.name}的${targetCityNameForLog}`
    )

    debugLog(`[先声夺人] ===== 交换完成总结 =====`)
    debugLog(`[先声夺人] ${initiator.name}[${initiatorCityName}] ⇄ ${targetPlayer.name}[${targetCityNameForLog}]`)
    swapDetails.forEach(detail => debugLog(`[先声夺人] - ${detail}`))
    debugLog(`[先声夺人] ============================`)

    return {
      success: true,
      message: `交换成功：${initiatorCityName} ⇄ ${targetCityNameForLog}`
    }
  }
}
