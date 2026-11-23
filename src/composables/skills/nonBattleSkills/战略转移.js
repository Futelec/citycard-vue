/**
 * 金币技能：战略转移
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteZhanLueZhuanYi(gameStore) {
  return function executeZhanLueZhuanYi(caster, newCenter) {
    if (!newCenter) {
      return { success: false, message: '未选择新中心城市' }
    }

    // 不能选择当前中心城市
    if (newCenter.name === caster.centerCityName || newCenter.isCenter) {
      return { success: false, message: '不能选择当前中心城市' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('战略转移', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    const oldCenter = Object.values(caster.cities).find(c => c.isCenter)

    if (oldCenter) {
      oldCenter.isCenter = false
    }

    newCenter.isCenter = true
    caster.centerCityName = newCenter.name  // 更新centerCityName
    const currentHp = newCenter.currentHp || newCenter.hp
    newCenter.currentHp = Math.floor(currentHp * TUNE.zhanLueZhuanYi.hpMultiplier)

    // 双日志：公开显示使用技能，详情仅施法者可见
    addSkillUsageLog(
      gameStore,
      caster.name,
      '战略转移',
      `${caster.name}使用了战略转移`,
      `${caster.name}使用战略转移，${newCenter.name}成为新中心(HP+50%: ${Math.floor(currentHp)} → ${Math.floor(newCenter.currentHp)})`
    )

    return {
      success: true,
      message: `${newCenter.name}成为新中心，HP+50%`
    }
  }
}
