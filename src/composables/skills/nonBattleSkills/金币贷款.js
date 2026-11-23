/**
 * 金币技能：金币贷款
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJinBiDaiKuan(gameStore) {
  return function executeJinBiDaiKuan(caster) {
    // 检查使用次数（每局限1次）
    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('金币贷款', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 立即获得5金币（原版逻辑）
    caster.gold = Math.min(caster.gold + TUNE.jinBiDaiKuan.goldGain, TUNE.jinBiDaiKuan.goldCap)

    // 设置2回合冷却期（接下来2回合无法获得自动金币）
    // 使用gameStore.goldLoanRounds统一管理状态
    gameStore.goldLoanRounds[caster.name] = TUNE.jinBiDaiKuan.cooldownRounds

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '金币贷款',
      `${caster.name}使用金币贷款，获得5金币但接下来2回合无法获得自动金币（每局限1次）`,
      `${caster.name}使用了金币贷款`
    )

    return {
      success: true,
      message: '获得5金币，但接下来2回合无法获得自动金币'
    }
  }
}
