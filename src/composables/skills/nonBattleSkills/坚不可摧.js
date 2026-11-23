/**
 * 金币技能：坚不可摧
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJianBuKeCui(gameStore) {
  return function executeJianBuKeCui(caster) {
    // 检查是否已有坚不可摧护盾
    if (gameStore.jianbukecui[caster.name] && gameStore.jianbukecui[caster.name].roundsLeft > 0) {
      return {
        success: false,
        message: '已有坚不可摧护盾，无需重复使用'
      }
    }

    // 检查"相同轮次只能有一个玩家拥有护盾"
    const hasActiveShield = Object.keys(gameStore.jianbukecui).some(playerName => {
      return playerName !== caster.name &&
             gameStore.jianbukecui[playerName] &&
             gameStore.jianbukecui[playerName].roundsLeft > 0
    })
    if (hasActiveShield) {
      return {
        success: false,
        message: '相同轮次只能有一个玩家拥有坚不可摧护盾'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('坚不可摧', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 设置坚不可摧护盾（持续3回合）
    gameStore.jianbukecui[caster.name] = {
      roundsLeft: TUNE.jianBuKeCui.rounds
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '坚不可摧',
      `${caster.name}使用坚不可摧，获得护盾保护，持续3回合`,
      `${caster.name}使用了坚不可摧`
    )

    return {
      success: true,
      message: `获得坚不可摧护盾，持续3回合，可阻挡40+种攻击技能`
    }
  }
}
