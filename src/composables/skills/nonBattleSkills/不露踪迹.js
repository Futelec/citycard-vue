/**
 * 金币技能：不露踪迹
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteBuLuZongJi(gameStore) {
  return function executeBuLuZongJi(caster) {
    // 检查是否已处于不露踪迹状态
    if (gameStore.stealth && gameStore.stealth[caster.name] && gameStore.stealth[caster.name].roundsLeft > 0) {
      return {
        success: false,
        message: '已处于不露踪迹状态'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('不露踪迹', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化stealth结构
    if (!gameStore.stealth) {
      gameStore.stealth = {}
    }

    gameStore.stealth[caster.name] = {
      roundsLeft: TUNE.buLuZongJi.rounds
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '不露踪迹',
      `${caster.name}使用了不露踪迹，接下来3回合技能使用情况将对其他玩家隐藏`,
      `${caster.name}使用了不露踪迹`
    )

    return {
      success: true,
      message: '进入不露踪迹状态，持续3回合'
    }
  }
}
