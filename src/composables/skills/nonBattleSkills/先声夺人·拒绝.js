/**
 * 金币技能：先声夺人·拒绝
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createRejectPreemptiveStrike(gameStore) {
  return function rejectPreemptiveStrike(swapId) {
    // 关键修复：Pinia会自动解包ref，直接使用gameStore.pendingSwaps（不需要.value）
    const swap = gameStore.pendingSwaps.find(s => s.id === swapId)
    if (!swap || swap.status !== 'pending') {
      return {
        success: false,
        message: '未找到待处理的交换请求或请求已失效'
      }
    }

    // 找到目标玩家（拒绝者）
    const targetPlayer = gameStore.players.find(p => p.name === swap.targetName)
    if (!targetPlayer) {
      return {
        success: false,
        message: '玩家数据异常'
      }
    }

    // 检查金币是否足够（需要11金币使用无懈可击）
    if (targetPlayer.gold < SKILL_COSTS['无懈可击']) {
      return {
        success: false,
        message: `拒绝交换需要使用无懈可击技能（花费${SKILL_COSTS['无懈可击']}金币），当前金币不足（${targetPlayer.gold}/${SKILL_COSTS['无懈可击']}）`
      }
    }

    // 扣除金币
    targetPlayer.gold -= SKILL_COSTS['无懈可击']
    debugLog(`[先声夺人] ${swap.targetName}使用无懈可击拒绝交换，花费${SKILL_COSTS['无懈可击']}金币，剩余${targetPlayer.gold}金币`)

    // 更新请求状态
    gameStore.updatePendingSwapStatus(swapId, 'rejected')

    // 退还发起者的使用次数（从集中式追踪系统中扣减）
    gameStore.decreaseSkillUsageCount(swap.initiatorName, '先声夺人')
    debugLog(`[先声夺人] 退还${swap.initiatorName}的使用次数`)

    // 清除冷却时间
    gameStore.clearSkillCooldown(swap.initiatorName, '先声夺人')
    debugLog(`[先声夺人] 清除${swap.initiatorName}的冷却时间`)

    // 双日志：记录拒绝（使用无懈可击）
    addSkillEffectLog(
      gameStore,
      `(先声夺人) ${swap.targetName}使用无懈可击拒绝了${swap.initiatorName}的交换请求（花费${SKILL_COSTS['无懈可击']}金币）`
    )

    debugLog(`[先声夺人] ${swap.targetName}拒绝了交换请求`)

    return {
      success: true,
      message: `已使用无懈可击拒绝交换请求（花费${SKILL_COSTS['无懈可击']}金币，剩余${targetPlayer.gold}金币）`
    }
  }
}
