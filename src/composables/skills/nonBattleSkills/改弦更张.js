/**
 * 金币技能：改弦更张
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteGaiXianGengZhang(gameStore) {
  return function executeGaiXianGengZhang(caster) {
    // 检查玩家状态：是否已经确认部署
    const playerState = gameStore.playerStates[caster.name]
    if (!playerState || !playerState.deploymentConfirmed) {
      return {
        success: false,
        message: '只能在确认出战后使用改弦更张'
      }
    }

    // 检查其他玩家是否还未确认（确保自己确认了但对手还没确认）
    const otherPlayers = gameStore.players.filter(p => p.name !== caster.name)
    const allOthersNotConfirmed = otherPlayers.every(p => {
      const state = gameStore.playerStates[p.name]
      return !state || !state.deploymentConfirmed
    })

    if (!allOthersNotConfirmed) {
      return {
        success: false,
        message: '只能在对手确认出战前使用改弦更张'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('改弦更张', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 撤回部署：清除玩家状态
    if (playerState) {
      playerState.deploymentConfirmed = false
      playerState.currentBattleCities = null
      playerState.battleGoldSkill = null
      playerState.activatedCitySkills = null
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '改弦更张',
      `${caster.name}使用改弦更张，撤回本回合出战部署，可以重新选择出战城市和技能`,
      `${caster.name}使用了改弦更张`
    )

    return {
      success: true,
      message: '已撤回本回合部署，请重新选择出战城市和技能',
      needsRedeployment: true  // 标记需要重新部署
    }
  }
}
