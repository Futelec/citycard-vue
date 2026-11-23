/**
 * 金币技能：技能保护
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJiNengBaoHu(gameStore) {
  return function executeJiNengBaoHu(caster) {
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('技能保护', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化结构
    if (!gameStore.skillProtection) {
      gameStore.skillProtection = {}
    }

    // 设置技能保护
    gameStore.skillProtection[caster.name] = { roundsLeft: TUNE.jiNengBaoHu.rounds }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '技能保护',
      `${caster.name}使用了技能保护，接下来10回合对手无法使用事半功倍、过河拆桥技能`,
      `${caster.name}使用了技能保护`
    )

    return {
      success: true,
      message: '技能保护生效！对手10回合内无法使用特定技能'
    }
  }
}
