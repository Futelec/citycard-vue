/**
 * 金币技能：焕然一新
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteHuanRanYiXin(gameStore) {
  return function executeHuanRanYiXin(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('焕然一新', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 重置城市专属技能的使用次数
    if (selfCity.skillUsageCount) {
      selfCity.skillUsageCount = 0
    }

    // 如果城市有特殊状态，也可以清除（可选）
    if (selfCity.specialState) {
      delete selfCity.specialState
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '焕然一新',
      `${caster.name}对${selfCity.name}使用焕然一新，城市专属技能使用次数已重置`,
      `${caster.name}使用了焕然一新`
    )

    return {
      success: true,
      message: `${selfCity.name}的城市专属技能使用次数已重置到0`
    }
  }
}
