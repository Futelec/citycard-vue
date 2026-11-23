/**
 * 金币技能：转账给他人
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteTransferGold(gameStore) {
  return function executeTransferGold(caster, target, amount) {
    if (!amount || amount <= 0) {
      return { success: false, message: '转账金额无效' }
    }

    if (caster.gold < amount) {
      return { success: false, message: '金币不足' }
    }

    if (target.gold + amount > TUNE.transferGold.goldCap) {
      return { success: false, message: '对方金币已达上限24' }
    }

    caster.gold -= amount
    target.gold += amount

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '转账给他人',
      `${caster.name}转账${amount}金币给${target.name}`,
      `${caster.name}转账了${amount}金币给${target.name}`
    )

    return {
      success: true,
      message: `成功转账${amount}金币`
    }
  }
}
